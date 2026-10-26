import express from "express";

const app = express();
const port = Number(process.env.PORT) || 3000;
const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
const model = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
const ollamaTimeoutMs = 120_000;

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }

  let ollamaResponse;

  try {
    ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: message }],
        stream: false
      }),
      signal: AbortSignal.timeout(ollamaTimeoutMs)
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({ error: "Ollama request timed out" });
    }

    console.error("Could not connect to Ollama:", error);
    return res.status(502).json({
      error: "Could not connect to Ollama. Check that Ollama is running and the URL is correct."
    });
  }

  if (!ollamaResponse.ok) {
    console.error(`Ollama returned HTTP ${ollamaResponse.status}`);
    return res.status(502).json({
      error: `Ollama returned HTTP ${ollamaResponse.status}. Check that the model is available.`
    });
  }

  let ollamaData;

  try {
    ollamaData = await ollamaResponse.json();
  } catch (error) {
    console.error("Ollama returned an invalid JSON response:", error);
    return res.status(502).json({ error: "Ollama returned an invalid response" });
  }

  const assistantResponse = ollamaData.message?.content;

  if (typeof assistantResponse !== "string") {
    console.error("Ollama response did not contain assistant message text");
    return res.status(502).json({ error: "Ollama response did not contain a message" });
  }

  return res.json({ response: assistantResponse });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must contain valid JSON" });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }

  console.error("Unexpected request error:", error);
  return res.status(500).json({ error: "An unexpected server error occurred" });
});

app.listen(port, () => {
  console.log(`Backend is running at http://localhost:${port}`);
});

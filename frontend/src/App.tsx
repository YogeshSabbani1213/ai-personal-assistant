import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type BackendStatus = "checking" | "online" | "offline";

const welcomeMessage: Message = {
  id: 0,
  role: "assistant",
  content: "Hello! I’m your AI Personal Assistant. What would you like to talk about?"
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const nextMessageId = useRef(1);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error(`Backend health check failed (HTTP ${response.status}).`);
        }

        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("status" in data) ||
          data.status !== "ok"
        ) {
          throw new Error("Backend health check returned an invalid response.");
        }

        setBackendStatus("online");
      } catch {
        setBackendStatus("offline");
      }
    };

    void checkBackend();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      setBackendStatus("online");

      if (!response.ok) {
        let detail = "";
        try {
          const errorData: unknown = await response.json();
          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "error" in errorData &&
            typeof errorData.error === "string"
          ) {
            detail = ` ${errorData.error}`;
          }
        } catch {
          // The HTTP status remains useful even if the backend error body is not JSON.
        }
        throw new Error(`The assistant could not reply (HTTP ${response.status}).${detail}`);
      }

      const data: unknown = await response.json();
      if (
        typeof data !== "object" ||
        data === null ||
        !("response" in data) ||
        typeof data.response !== "string"
      ) {
        throw new Error("The backend returned an invalid response. Please try again.");
      }

      const assistantMessage = data.response;
      setMessages((currentMessages) => [
        ...currentMessages,
        { id: nextMessageId.current++, role: "user", content: message },
        { id: nextMessageId.current++, role: "assistant", content: assistantMessage }
      ]);
      setInput("");
    } catch (error) {
      if (error instanceof TypeError) {
        setBackendStatus("offline");
      }
      setErrorMessage(
        error instanceof TypeError
          ? "Could not reach the backend. Make sure it is running at http://localhost:3000."
          : error instanceof Error
            ? error.message
            : "Something went wrong while contacting the assistant. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-8 sm:py-8">
      <header className="flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-800 text-xl text-white" aria-hidden="true">
            ✳
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight sm:text-lg">Keess - My Personal Assistant</span>
            <span className="block text-xs text-slate-500">A private, local conversation</span>
          </span>
        </a>
        <div
          className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
          role="status"
          aria-live="polite"
        >
          <span
            className={`size-2 rounded-full ${
              backendStatus === "online"
                ? "bg-emerald-500"
                : backendStatus === "offline"
                  ? "bg-rose-500"
                  : "animate-pulse bg-amber-400"
            }`}
            aria-hidden="true"
          />
          {backendStatus === "checking"
            ? "Checking backend"
            : backendStatus === "online"
              ? "Backend connected"
              : "Backend unavailable"}
        </div>
      </header>

      <section className="mx-auto flex w-full flex-1 flex-col py-8 sm:py-12" aria-label="Assistant chat">
        <div className="mb-7 text-center">
          <p className="mb-2 text-sm font-medium text-emerald-800">Your local AI companion</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A little help, right here.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
            Ask a question or start a conversation. Your assistant runs locally on this computer.
          </p>
        </div>

        <div className="flex min-h-72 flex-1 flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm sm:min-h-96 sm:p-7">
          <MessageBubble message={welcomeMessage} />
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 self-start rounded-2xl rounded-bl-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-1.5 animate-bounce rounded-full bg-emerald-700 [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-emerald-700 [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-emerald-700" />
              </span>
              Thinking…
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>

        <form onSubmit={sendMessage} className="mt-4">
          {errorMessage && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              {errorMessage}
            </p>
          )}
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/10">
            <label className="sr-only" htmlFor="message-input">Your message</label>
            <textarea
              id="message-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Message your assistant…"
              rows={1}
              disabled={isLoading}
              className="max-h-36 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <span>Send</span>
              <span aria-hidden="true">↑</span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            Enter to send · Shift + Enter for a new line
          </p>
        </form>
      </section>
    </main>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex max-w-[90%] flex-col gap-1.5 sm:max-w-[78%] ${isUser ? "self-end" : "self-start"}`}>
      <span className={`px-1 text-xs font-medium ${isUser ? "text-right text-slate-500" : "text-emerald-900"}`}>
        {isUser ? "You" : "Assistant"}
      </span>
      <p
        className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "rounded-br-md bg-emerald-800 text-white"
            : "rounded-bl-md bg-emerald-50 text-slate-800"
        }`}
      >
        {message.content}
      </p>
    </article>
  );
}

export default App;

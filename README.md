
# AI Personal Assistant

A beginner-friendly AI personal assistant built with free, locally running AI tools.

## Current Features

- Chat with a locally running Ollama model
- Backend connectivity status
- Conversation visible for the current page session

Task management, reminders, and persistent memory are not implemented yet.

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: Node.js and Express
- AI: Ollama with a lightweight local model
- Database: To be decided during development
- Version Control: Git and GitHub

## Project Structure

- `frontend/` - User interface
- `backend/` - Assistant logic and API

## Development Status

Initial chat interface milestone.

## Running Locally

Start the backend from `backend/` with `npm start`, then start the frontend from
`frontend/` with `npm run dev`. The frontend uses a Vite development proxy to
forward `/api` requests to `http://localhost:3000`.

## Cost

The project is designed to run locally using free software and open-source tools. Hardware, electricity, and any optional external services may have separate costs.

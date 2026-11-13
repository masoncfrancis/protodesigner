# ProtoDesigner

ProtoDesigner turns an early product idea into a physical-design brief, an AI-generated concept image, and editable OpenSCAD starter code. A guided chat helps shape the enclosure—form, scale, placement, controls, materials, and build constraints—then lets you review and edit the brief before generating concepts.

Generated images and code are concept starting points, not validated manufacturing designs.

## Requirements

- Python 3.11 or newer
- [uv](https://docs.astral.sh/uv/)
- Node.js and npm (compatible with Vite 8)
- API credentials for an OpenAI Responses API provider and Google Gemini

## Configure API credentials

Create `server/.env` and set provider credentials and the required OpenAI model:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_responses_api_model # we used gpt-6-luna in testing

GEMINI_API_KEY=your_gemini_api_key

# Defaults to https://api.openai.com/v1
OPENAI_BASE_URL=https://api.openai.com/v1

# Defaults to gemini-nano-banana-2.1
GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1

# Defaults to gemini-3.8-flash
GEMINI_CODE_MODEL=gemini-3.8-flash
```

The OpenAI provider must support the Responses API. Keep API keys private; do not commit `server/.env`.

## Install and run

Install backend dependencies:

```sh
cd server
uv sync
```

Start the API in one terminal, from `server/`:

```sh
uv run uvicorn app.main:app --reload --port 8000
```

Install and start the frontend in a second terminal:

```sh
cd client
npm ci
npm run dev
```

Open the local URL printed by Vite (usually <http://localhost:5173>). Vite proxies `/api` requests to the backend at `http://localhost:8000`. Check backend status at <http://localhost:8000/health>.

## Useful commands

Run from `client/`:

```sh
npm run build  # Type-check and create production build in dist/
npm run lint   # Run Oxlint
npm run preview # Preview production build locally
```

## Project structure

- `client/` — React, TypeScript, and Vite web app
- `server/` — FastAPI API and AI provider integrations

The API uses the configured OpenAI-compatible provider for design chat and brief drafting, and Gemini for concept-image and OpenSCAD generation.

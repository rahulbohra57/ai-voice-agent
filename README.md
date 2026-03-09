# AI Voice Agent

🔗 **Live App:** [https://ai-voice-agent-sf81.onrender.com](https://ai-voice-agent-sf81.onrender.com)

## About the App

AI Voice Agent is a real-time voice assistant that lets users speak in English or Hindi and receive intelligent, spoken responses. It transcribes speech, generates contextual replies via an LLM, and returns high-quality synthesized audio — all through a clean browser interface. Multiple voice personas are available, each with a unique identity and accent.

## Architecture Overview

The app follows a linear speech pipeline: the browser captures microphone audio and POSTs it to a FastAPI backend, which transcribes it using the Groq Whisper API (forcing the correct script per agent language). The transcript is forwarded to either Google Gemini 2.5 Flash (English agents) or Groq LLaMA 3.3 70B (Hindi agents), each maintaining per-agent conversation history and identity. The LLM response is converted to speech via OpenAI TTS with Microsoft Neural edge-tts voices, and the resulting audio file is streamed back to the frontend for playback.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11, FastAPI, Uvicorn |
| Speech-to-Text | Groq Whisper API (`whisper-large-v3`) |
| Language Model (English) | Google Gemini 2.5 Flash (`gemini-2.5-flash`) |
| Language Model (Hindi) | Groq LLaMA 3.3 70B (`llama-3.3-70b-versatile`) |
| Text-to-Speech | OpenAI TTS API (`tts-1`) + edge-tts |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Containerization | Docker |
| CI/CD | GitHub Actions → GHCR |
| Deployment | Render.com (Docker, free tier) |

## Key Features

- Multi-language support: English and Hindi speech input and output
- 8 distinct voice agents (British, American, Indian English + Hindi personas), each with a unique name and identity
- Language-enforced transcription: Hindi agents force Devanagari input; English agents force English text
- Per-agent LLM instances with isolated conversation histories — no cross-agent confusion
- Clean chat UI with conversation bubbles, mic button, and audio playback

## User Instructions

1. Open the app and select a voice agent from the available personas (e.g. Jenny, Swara, Oliver)
2. Click **Start Listening** and speak in English or Hindi
3. Wait for the agent to transcribe your speech, generate a reply, and play the audio response

## Note

The following API keys must be set as environment variables before running:

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Speech-to-text (Whisper) + Text-to-speech |
| `GOOGLE_API_KEY` | Gemini LLM for English agents |
| `GROQ_API_KEY` | Whisper transcription + LLaMA for Hindi agents |

Copy `.env.example` to `.env` and fill in your keys before starting the server.

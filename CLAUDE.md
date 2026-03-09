# AI Voice Assistant (English + Hindi)

## Project Overview

This project is a real-time AI Voice Assistant that allows a user to speak to the system and receive spoken responses. The assistant supports **English and Hindi** conversations.

The assistant performs the following pipeline:

User Speech → Speech-to-Text → LLM Response → Text-to-Speech → Audio Reply

The assistant runs locally with a Python backend and a lightweight web interface.

---

# Tech Stack

## Backend

Python
FastAPI
Uvicorn

## Frontend

HTML
CSS
Vanilla JavaScript (preferred for simplicity)

Optional upgrade:
React / Next.js if needed later

---

# AI Models

## Speech-to-Text

Model: openai/whisper-small or openai/whisper-base
Source: HuggingFace Transformers

Reason:
• Good multilingual support
• Works well for Hindi + English
• Free and open-source

---

## Language Model (Conversation Engine)

Preferred API:
OpenAI GPT / Claude API

Optional local model:
mistralai/Mistral-7B-Instruct

The LLM should receive the transcription and generate a conversational response.

The assistant must respond in the same language detected from the user speech (Hindi or English).

---

## Text-to-Speech

Model: coqui/XTTS-v2

Reasons:
• High quality speech
• Supports Hindi and English
• Open-source
• Fast enough locally

---

# Core Functional Flow

1. User clicks "Start Listening"
2. Browser records microphone audio
3. Audio is sent to FastAPI backend
4. Backend runs Speech-to-Text
5. Transcribed text is sent to the LLM
6. LLM generates response text
7. Response text is converted to speech using TTS
8. Audio file returned to frontend
9. Frontend plays the assistant voice

---

# Features

• English + Hindi speech recognition
• AI conversational responses
• AI-generated voice replies
• Clean chat interface
• Microphone recording
• Play audio responses
• Display conversation history

---

# Project Structure

ai-voice-assistant/
│
├── backend/
│   ├── main.py
│   ├── speech_to_text.py
│   ├── text_to_speech.py
│   ├── llm_engine.py
│   ├── config.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── models/
│
├── README.md
└── CLAUDE.md

---

# Backend Responsibilities

## main.py

FastAPI server
Handles API endpoints:

POST /transcribe
POST /generate-response
POST /speak

---

## speech_to_text.py

Loads Whisper model
Accepts audio file
Returns transcribed text

---

## llm_engine.py

Handles conversation logic
Receives user text
Returns assistant reply

Must support:
• Hindi
• English

---

## text_to_speech.py

Loads XTTS-v2 model
Converts text response to speech
Returns WAV audio

---

# Frontend Responsibilities

## index.html

Simple interface with

• microphone button
• chat display
• play audio

---

## script.js

Handles:

• microphone recording
• sending audio to backend
• displaying chat messages
• playing assistant audio response

---

# API Flow

Frontend records audio

POST /transcribe

Backend returns:

{
"text": "Hello how are you"
}

Frontend sends text to:

POST /generate-response

Backend returns:

{
"response": "I am doing well. How can I help you?"
}

Frontend sends response to:

POST /speak

Backend returns audio file

Frontend plays audio.

---

# UI Requirements

Clean minimal UI.

Must include:

• Chat bubbles
• Mic button
• AI speaking indicator
• Conversation history

---

# Installation Requirements

Python 3.10+

Required libraries:

fastapi
uvicorn
transformers
torch
soundfile
coqui-tts
pydub
python-multipart

---

# Future Improvements

• wake word detection
• streaming responses
• emotion detection
• local LLM
• mobile version

---

# Expected Final Output

A browser-based AI assistant where the user can:

Speak in Hindi or English
Receive intelligent responses
Hear the AI reply in natural voice

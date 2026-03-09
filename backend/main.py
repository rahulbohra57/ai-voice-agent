import uuid
import tempfile
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.config import (
    AUDIO_DIR, FRONTEND_DIR, VOICES,
    GREETING_VOICE_ID, GREETING_TEXT,
)

# Ensure audio output directory exists before StaticFiles mount
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

from backend.speech_to_text import SpeechToText
from backend.llm_engine import LLMEngine
from backend.text_to_speech import TextToSpeech


class GenerateRequest(BaseModel):
    text: str
    language: str = "en"
    agent_name: str = "Assistant"


class SpeakRequest(BaseModel):
    text: str
    voice_id: str = "en-US-JennyNeural"


stt: SpeechToText
llm: LLMEngine
tts: TextToSpeech


@asynccontextmanager
async def lifespan(app: FastAPI):
    global stt, llm, tts
    stt = SpeechToText()
    llm = LLMEngine()
    tts = TextToSpeech()
    # Pre-generate greeting audio
    greeting_path = str(AUDIO_DIR / "greeting.mp3")
    if not Path(greeting_path).exists():
        await tts.synthesize(GREETING_TEXT, GREETING_VOICE_ID, greeting_path)
    yield


app = FastAPI(title="AI Voice Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/voices")
async def get_voices():
    return {"voices": VOICES}


@app.get("/greeting")
async def get_greeting():
    greeting_path = AUDIO_DIR / "greeting.mp3"
    if not greeting_path.exists():
        await tts.synthesize(GREETING_TEXT, GREETING_VOICE_ID, str(greeting_path))
    return {"audio_url": "/audio/greeting.mp3"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), voice_lang: str = Form("en")):
    suffix = Path(audio.filename).suffix if audio.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        result = stt.transcribe(tmp_path, voice_lang=voice_lang)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
    return result


@app.post("/generate-response")
async def generate_response(req: GenerateRequest):
    try:
        reply = llm.generate_response(req.text, req.language, req.agent_name)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    return {"response": reply}


@app.post("/speak")
async def speak(req: SpeakRequest):
    filename = f"{uuid.uuid4()}.mp3"
    output_path = str(AUDIO_DIR / filename)
    try:
        await tts.synthesize(req.text, req.voice_id, output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"audio_url": f"/audio/{filename}"}


# Serve generated audio files
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

# Serve frontend — must be last
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

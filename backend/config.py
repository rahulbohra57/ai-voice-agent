import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"
GEMINI_MODEL: str = "gemini-2.5-flash"

BASE_DIR: Path = Path(__file__).resolve().parent.parent
AUDIO_DIR: Path = BASE_DIR / "audio_output"
FRONTEND_DIR: Path = BASE_DIR / "frontend"

VOICES = [
    {
        "id": "en-GB-RyanNeural",
        "name": "Ryan",
        "accent": "British English",
        "gender": "Male",
        "lang": "en",
        "flag": "🇬🇧",
        "avatar": "👨‍💼",
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia",
        "accent": "British English",
        "gender": "Female",
        "lang": "en",
        "flag": "🇬🇧",
        "avatar": "👩‍💼",
    },
    {
        "id": "en-US-GuyNeural",
        "name": "Guy",
        "accent": "American English",
        "gender": "Male",
        "lang": "en",
        "flag": "🇺🇸",
        "avatar": "👨‍💻",
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny",
        "accent": "American English",
        "gender": "Female",
        "lang": "en",
        "flag": "🇺🇸",
        "avatar": "👩‍💻",
    },
    {
        "id": "en-US-AriaNeural",
        "name": "Aria",
        "accent": "American English",
        "gender": "Female",
        "lang": "en",
        "flag": "🇺🇸",
        "avatar": "👩‍🎤",
    },
    {
        "id": "en-GB-OliverNeural",
        "name": "Oliver",
        "accent": "British English",
        "gender": "Male",
        "lang": "en",
        "flag": "🇬🇧",
        "avatar": "🧑‍💼",
    },
    {
        "id": "hi-IN-MadhurNeural",
        "name": "Madhur",
        "accent": "Hindi",
        "gender": "Male",
        "lang": "hi",
        "flag": "🇮🇳",
        "avatar": "🧑",
    },
    {
        "id": "hi-IN-SwaraNeural",
        "name": "Swara",
        "accent": "Hindi",
        "gender": "Female",
        "lang": "hi",
        "flag": "🇮🇳",
        "avatar": "👩",
    },
]

GREETING_VOICE_ID: str = "en-US-JennyNeural"
GREETING_TEXT: str = (
    "Hello! Hope you're having a great day. "
    "Please choose a voice agent to get started."
)

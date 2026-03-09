from groq import Groq
from backend.config import GROQ_API_KEY, GROQ_WHISPER_MODEL


class SpeechToText:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)

    def transcribe(self, audio_path: str, voice_lang: str = "en") -> dict:
        # For English agents, force Whisper to transcribe in English only.
        # For Hindi agents, allow Hindi or English (no constraint).
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        kwargs = {
            "file": (audio_path, audio_bytes),
            "model": GROQ_WHISPER_MODEL,
            "response_format": "verbose_json",
            # Force transcription script to match the agent's language.
            # EN agents → English text; HI agents → Devanagari Hindi text.
            "language": voice_lang,
        }

        result = self.client.audio.transcriptions.create(**kwargs)
        text = result.text.strip() if result.text else ""
        return {"text": text, "language": voice_lang}

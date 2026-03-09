import re
from google import genai
from google.genai import types
from groq import Groq
from backend.config import GOOGLE_API_KEY, GEMINI_MODEL, GROQ_API_KEY

# ── System prompts ─────────────────────────────────────────────────────────────
_BASE = (
    "Keep responses concise and natural for voice conversation. "
    "IMPORTANT: Never use any markdown formatting such as **bold**, *italic*, "
    "bullet points, numbered lists, or headers. "
    "Respond in plain text only — your response will be spoken aloud."
)

_EN_RULE = (
    "You MUST respond exclusively in English regardless of what language the user speaks. "
    "Do not use Hindi, Urdu, or any other language."
)

_HI_RULE = (
    "Always respond in Hindi using Devanagari script. "
    "Exception: if the user's message is ONLY a common English greeting such as Hello, Hi, Hey, "
    "Good morning, Good evening, or Good night, you may respond in English to that greeting. "
    "For all other messages — even if they contain English words — respond in Hindi (Devanagari). "
    "Never use Urdu script."
)


def _build_system_prompt(agent_name: str, lang: str) -> str:
    lang_rule = _HI_RULE if lang == "hi" else _EN_RULE
    return (
        f"Your name is {agent_name}. You are {agent_name}, a helpful voice assistant. "
        f"Always refer to yourself as {agent_name} if asked for your name. "
        f"{_BASE} {lang_rule}"
    )

GROQ_HINDI_MODEL = "llama-3.3-70b-versatile"


def _strip_markdown(text: str) -> str:
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'_{1,3}(.*?)_{1,3}', r'\1', text, flags=re.DOTALL)
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'^[\*\-\+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ── English engine — Google Gemini ─────────────────────────────────────────────
class _GeminiEngine:
    def __init__(self, agent_name: str):
        self.client = genai.Client(api_key=GOOGLE_API_KEY)
        self.history: list[types.Content] = []
        self._system = _build_system_prompt(agent_name, "en")

    def generate(self, user_text: str) -> str:
        self.history.append(
            types.Content(role="user", parts=[types.Part(text=user_text)])
        )
        response = self.client.models.generate_content(
            model=GEMINI_MODEL,
            contents=self.history,
            config=types.GenerateContentConfig(system_instruction=self._system),
        )
        reply = _strip_markdown(response.text or "")
        self.history.append(
            types.Content(role="model", parts=[types.Part(text=reply)])
        )
        return reply


# ── Hindi engine — Groq LLaMA 3.3 70B ─────────────────────────────────────────
class _GroqHindiEngine:
    def __init__(self, agent_name: str):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.history: list[dict] = []
        self._system = _build_system_prompt(agent_name, "hi")

    def generate(self, user_text: str) -> str:
        self.history.append({"role": "user", "content": user_text})
        response = self.client.chat.completions.create(
            model=GROQ_HINDI_MODEL,
            messages=[{"role": "system", "content": self._system}] + self.history,
            temperature=0.7,
            max_tokens=512,
        )
        reply = _strip_markdown(response.choices[0].message.content or "")
        self.history.append({"role": "assistant", "content": reply})
        return reply


# ── Public facade ──────────────────────────────────────────────────────────────
class LLMEngine:
    """One engine per agent, keyed by agent name. Each has its own identity + history."""

    def __init__(self):
        self._engines: dict[str, _GeminiEngine | _GroqHindiEngine] = {}

    def _get_engine(self, agent_name: str, language: str):
        if agent_name not in self._engines:
            if language == "hi":
                self._engines[agent_name] = _GroqHindiEngine(agent_name)
            else:
                self._engines[agent_name] = _GeminiEngine(agent_name)
        return self._engines[agent_name]

    def generate_response(self, user_text: str, language: str = "en", agent_name: str = "Assistant") -> str:
        engine = self._get_engine(agent_name, language)
        return engine.generate(user_text)

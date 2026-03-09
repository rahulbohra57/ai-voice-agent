import edge_tts


class TextToSpeech:
    async def synthesize(self, text: str, voice_id: str, output_path: str) -> str:
        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(output_path)
        return output_path

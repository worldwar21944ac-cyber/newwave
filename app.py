"""Simple Flask backend providing mock long-form TTS endpoints.

This module exposes endpoints expected by the accompanying
front-end application:

- ``GET /api/tts/voices`` lists available voices.
- ``GET /api/tts/settings`` reads the active synthesis settings.
- ``POST /api/tts/settings`` updates one or more settings.
- ``POST /api/tts/generate`` creates a placeholder audio file based on
  the submitted text and returns metadata describing the file.
- ``GET /api/tts/audio/<filename>`` serves the generated audio file.

The implementation intentionally keeps dependencies light so the demo
is easy to run without external services.  Instead of invoking a real
TTS engine, audio output is synthesised with Python's built-in ``wave``
module by generating a sine wave whose duration is proportional to the
length of the requested text.  Although the audio is artificial, the
API surface mirrors what a production TTS service might expose, making
it suitable for front-end development and integration testing.
"""

from __future__ import annotations

import math
import os
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Dict, List

from flask import Flask, jsonify, make_response, request, send_from_directory

APP_ROOT = Path(__file__).resolve().parent
AUDIO_DIR = APP_ROOT / "generated_audio"
AUDIO_DIR.mkdir(exist_ok=True)

DEFAULT_SAMPLE_RATE = 22_050
DEFAULT_BIT_DEPTH = 16
DEFAULT_CHANNELS = 1


@dataclass
class Voice:
    """Represents a synthetic voice option."""

    id: str
    name: str
    language: str
    description: str


@dataclass
class Settings:
    """Runtime synthesis settings shared between requests."""

    voice: str = "narrator_en"
    speed: float = 1.0
    volume: float = 1.0
    updated_at: float = field(default_factory=lambda: time.time())

    def update(self, data: Dict[str, object]) -> None:
        """Update settings in-place from a partial dictionary."""

        if "voice" in data and isinstance(data["voice"], str):
            self.voice = data["voice"]
        if "speed" in data:
            try:
                speed = float(data["speed"])
            except (TypeError, ValueError):
                pass
            else:
                self.speed = max(0.25, min(speed, 3.0))
        if "volume" in data:
            try:
                volume = float(data["volume"])
            except (TypeError, ValueError):
                pass
            else:
                self.volume = max(0.0, min(volume, 2.0))
        self.updated_at = time.time()


VOICES: List[Voice] = [
    Voice(
        id="narrator_en",
        name="Calm Narrator",
        language="en-US",
        description="Neutral warm tone suited for audiobooks and articles.",
    ),
    Voice(
        id="storyteller_en",
        name="Animated Storyteller",
        language="en-US",
        description="Expressive delivery ideal for fiction and dramatic works.",
    ),
    Voice(
        id="mentor_uk",
        name="British Mentor",
        language="en-GB",
        description="Authoritative yet friendly, perfect for tutorials.",
    ),
]
VOICE_IDS = {voice.id for voice in VOICES}

settings = Settings()
settings_lock = threading.Lock()

app = Flask(__name__)


def _generate_waveform(
    text: str,
    *,
    speed: float,
    volume: float,
    sample_rate: int = DEFAULT_SAMPLE_RATE,
    bit_depth: int = DEFAULT_BIT_DEPTH,
) -> tuple[bytes, float]:
    """Generate a placeholder audio waveform.

    The duration scales with the amount of text and the requested speed.
    """

    min_duration = 2.0
    max_duration = 20.0
    base_duration = max(len(text) / 120.0, min_duration)
    duration = max(min_duration, min(base_duration / max(speed, 0.1), max_duration))

    amplitude = int((2 ** (bit_depth - 1) - 1) * max(0.05, min(volume, 2.0) / 2.0))
    frequency = 440.0 if "!" in text else 220.0
    total_frames = int(duration * sample_rate)

    frame_bytes = bytearray()
    for i in range(total_frames):
        t = i / sample_rate
        value = int(amplitude * math.sin(2.0 * math.pi * frequency * t))
        frame_bytes.extend(value.to_bytes(2, byteorder="little", signed=True))

    buffer = BytesIO()
    import wave

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(DEFAULT_CHANNELS)
        wav_file.setsampwidth(bit_depth // 8)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(frame_bytes)

    total_seconds = len(frame_bytes) / (sample_rate * (bit_depth // 8))
    return buffer.getvalue(), total_seconds


def _save_audio_file(data: bytes, *, extension: str = "wav") -> Path:
    filename = f"tts_{uuid.uuid4().hex}.{extension}"
    filepath = AUDIO_DIR / filename
    filepath.write_bytes(data)
    return filepath


@app.get("/api/tts/voices")
def list_voices():
    """Return all available voices."""

    return jsonify({"voices": [asdict(voice) for voice in VOICES]})


@app.route("/api/tts/settings", methods=["GET", "POST"])
def manage_settings():
    """Read or update synthesis settings."""

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        with settings_lock:
            settings.update(payload)
            updated = asdict(settings)
        return jsonify({"status": "updated", "settings": updated})

    with settings_lock:
        current = asdict(settings)
    return jsonify(current)


@app.post("/api/tts/generate")
def generate_audio():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    if not text:
        return make_response(jsonify({"error": "Text is required."}), 400)

    voice_id = payload.get("voice") or settings.voice
    if voice_id not in VOICE_IDS:
        return make_response(
            jsonify({"error": f"Unknown voice '{voice_id}'."}), 400
        )

    speed_value = payload.get("speed")
    if speed_value is None:
        speed = settings.speed
    else:
        try:
            speed = float(speed_value)
        except (TypeError, ValueError):
            return make_response(
                jsonify({"error": "Speed must be a numeric value."}), 400
            )
        speed = max(0.25, min(speed, 3.0))

    volume_value = payload.get("volume")
    if volume_value is None:
        volume = settings.volume
    else:
        try:
            volume = float(volume_value)
        except (TypeError, ValueError):
            return make_response(
                jsonify({"error": "Volume must be a numeric value."}), 400
            )
        volume = max(0.0, min(volume, 2.0))

    waveform, duration = _generate_waveform(text, speed=speed, volume=volume)
    audio_path = _save_audio_file(waveform)

    metadata = {
        "file": audio_path.name,
        "url": f"/api/tts/audio/{audio_path.name}",
        "format": "wav",
        "sample_rate": DEFAULT_SAMPLE_RATE,
        "bit_depth": DEFAULT_BIT_DEPTH,
        "channels": DEFAULT_CHANNELS,
        "duration_seconds": round(duration, 2),
        "voice": voice_id,
        "speed": speed,
        "volume": volume,
    }
    return jsonify({"status": "ok", "metadata": metadata})


@app.get("/api/tts/audio/<path:filename>")
def serve_audio(filename: str):
    """Serve generated audio files."""

    safe_path = AUDIO_DIR / filename
    if not safe_path.exists() or not safe_path.is_file():
        return make_response(jsonify({"error": "File not found."}), 404)
    return send_from_directory(AUDIO_DIR, filename, as_attachment=False)


@app.get("/")
def index():
    """Provide a minimal landing page for quick manual testing."""

    return "<h1>Newwave TTS API</h1><p>Use the /api/tts endpoints to generate audio.</p>"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)

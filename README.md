# Newwave TTS API Backend

This repository contains a lightweight Flask server that mimics the
endpoints expected by the Newwave long-form text-to-speech front-end.
It does not perform real speech synthesis; instead it generates simple
placeholder WAV files so the UI can be developed and demonstrated
without connecting to an external TTS provider.

## Features

- `GET /api/tts/voices` – returns a curated list of demo voice options.
- `GET/POST /api/tts/settings` – reads and updates the active voice,
  speed, and volume settings.
- `POST /api/tts/generate` – produces a WAV file whose duration scales
  with the submitted text length and returns metadata for the front-end.
- `GET /api/tts/audio/<filename>` – serves previously generated audio files
  to the in-browser player or for download.

## Getting started

1. **Install dependencies**

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run the development server**

   ```bash
   flask --app app run --host 0.0.0.0 --port 5000
   ```

   The API will be available at `http://localhost:5000/` and ready for
   requests from the front-end interface.

3. **Clean up generated audio (optional)**

   Audio files created via the `/api/tts/generate` endpoint are stored in
   the `generated_audio/` directory. You can delete this folder at any
   time to remove previously generated samples.

## Notes

- The generated WAV files contain a simple sine wave rather than spoken
  words. This keeps the demo self-contained while preserving the API
  contract required by the UI.
- Speed and volume inputs influence the duration and amplitude of the
  generated waveform so that UI controls have visible effects.
- Replace the `_generate_waveform` function with calls to your preferred
  TTS engine when you are ready to integrate real speech synthesis.

import pytest

import app as app_module


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "AUDIO_DIR", tmp_path)
    app_module.app.config.update(TESTING=True)

    with app_module.app.test_client() as test_client:
        yield test_client


def test_list_voices(client):
    response = client.get("/api/tts/voices")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["voices"]
    assert {"id", "name", "language", "description"} <= payload["voices"][0].keys()


def test_generate_requires_text(client):
    response = client.post("/api/tts/generate", json={})

    assert response.status_code == 400
    assert response.get_json() == {"error": "Text is required."}


def test_generate_and_serve_audio(client):
    response = client.post(
        "/api/tts/generate",
        json={"text": "Newwave CI smoke test.", "voice": "narrator_en"},
    )

    assert response.status_code == 200
    metadata = response.get_json()["metadata"]
    assert metadata["format"] == "wav"
    assert metadata["duration_seconds"] > 0

    audio_response = client.get(metadata["url"])
    assert audio_response.status_code == 200
    assert audio_response.data.startswith(b"RIFF")

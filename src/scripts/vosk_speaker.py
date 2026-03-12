"""
vosk_speaker.py — Speaker embedding extraction via Vosk SpkModel.

CLI usage (called by Next.js API routes via child_process):
  python vosk_speaker.py extract <wav_path>
    → prints JSON: {"embedding": [128 floats]} or {"error": "..."}

  python vosk_speaker.py compare <wav_path> '<profiles_json>'
    profiles_json = '[{"name":"Juliano","voiceprint":[...]}, ...]'
    → prints JSON: {"match": bool, "speaker": "name"|null, "confidence": float, "reason": "compared"|"no_enrollment"|"no_voice_detected"}

wav_path must be a 16kHz mono PCM16 WAV file.
"""
import sys
import json
import os
import math

def get_project_root():
    # Script lives in src/scripts/, project root is two levels up
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(script_dir))

def get_asr_model():
    """Return a Vosk ASR Model, preferring a locally cached small model."""
    import vosk
    project_root = get_project_root()

    # Look for any local ASR model (not the SpkModel — those have final.ext.raw)
    models_dir = os.path.join(project_root, "models")
    if os.path.isdir(models_dir):
        for name in sorted(os.listdir(models_dir)):
            candidate = os.path.join(models_dir, name)
            # SpkModel has final.ext.raw; ASR models have conf/ directory
            conf_dir = os.path.join(candidate, "conf")
            if os.path.isdir(conf_dir):
                return vosk.Model(candidate)

    # Check vosk auto-download cache for Portuguese model first (matches user language)
    vosk_cache = os.path.join(os.path.expanduser("~"), ".vosk")
    for lang_hint in ["vosk-model-small-pt", "vosk-model-small-en"]:
        if os.path.isdir(vosk_cache):
            for name in sorted(os.listdir(vosk_cache)):
                if name.startswith(lang_hint):
                    candidate = os.path.join(vosk_cache, name)
                    conf_dir = os.path.join(candidate, "conf")
                    if os.path.isdir(conf_dir):
                        return vosk.Model(candidate)

    # Fall back: auto-download small pt model (~30 MB, cached once in ~/.vosk/)
    return vosk.Model(lang="pt")

def get_spk_model():
    import vosk
    project_root = get_project_root()
    spk_path = os.path.join(project_root, "models", "vosk-model-spk-0.4")
    return vosk.SpkModel(spk_path)

def extract_embedding(wav_path: str):
    """Return 128-dim speaker embedding as list of floats, or None."""
    import wave

    with wave.open(wav_path, "rb") as wf:
        if wf.getframerate() != 16000:
            raise ValueError(f"Expected 16kHz WAV, got {wf.getframerate()}Hz")
        if wf.getnchannels() != 1:
            raise ValueError(f"Expected mono WAV, got {wf.getnchannels()} channels")

        spk_model = get_spk_model()
        asr_model = get_asr_model()

        import vosk
        recognizer = vosk.KaldiRecognizer(asr_model, 16000)
        recognizer.SetSpkModel(spk_model)
        recognizer.SetWords(False)

        CHUNK = 8000  # 0.5s worth of 16kHz int16 (half a second)
        while True:
            data = wf.readframes(CHUNK)
            if not data:
                break
            recognizer.AcceptWaveform(data)

    result = json.loads(recognizer.FinalResult())
    spk_vec = result.get("spk")
    if spk_vec and len(spk_vec) == 128:
        return spk_vec
    return None

def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

THRESHOLD = 0.85

def cmd_extract(wav_path: str):
    try:
        embedding = extract_embedding(wav_path)
        if embedding:
            print(json.dumps({"embedding": embedding}))
        else:
            print(json.dumps({"error": "no_voice_detected"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

def cmd_compare(wav_path: str, profiles_json: str, threshold: float = 0.85):
    try:
        profiles = json.loads(profiles_json)
        if not profiles:
            print(json.dumps({"match": True, "speaker": None, "confidence": 1.0, "reason": "no_enrollment"}))
            return

        embedding = extract_embedding(wav_path)
        if not embedding:
            print(json.dumps({"match": False, "speaker": None, "confidence": 0.0, "reason": "no_voice_detected"}))
            return

        best_name = ""
        best_conf = 0.0
        for p in profiles:
            voiceprint = p.get("voiceprint") or []
            if len(voiceprint) != 128:
                continue
            sim = cosine_similarity(embedding, voiceprint)
            if sim > best_conf:
                best_conf = sim
                best_name = p.get("name", "")

        match = best_conf >= threshold
        print(json.dumps({
            "match": match,
            "speaker": best_name if match else None,
            "confidence": round(best_conf, 4),
            "reason": "compared",
        }))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: vosk_speaker.py extract <wav> | compare <wav> <profiles_json>"}))
        sys.exit(1)

    command = sys.argv[1]
    wav_path = sys.argv[2]

    if command == "extract":
        cmd_extract(wav_path)
    elif command == "compare":
        profiles_json = sys.argv[3] if len(sys.argv) > 3 else "[]"
        threshold = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        cmd_compare(wav_path, profiles_json, threshold)
    else:
        print(json.dumps({"error": f"unknown command: {command}"}))
        sys.exit(1)

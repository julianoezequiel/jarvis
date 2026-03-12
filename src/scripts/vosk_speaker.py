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
            # Support multi-sample format (voiceprints: list of embeddings)
            # and legacy single-sample format (voiceprint: single embedding)
            samples = p.get("voiceprints") or []
            if not samples:
                single = p.get("voiceprint") or []
                if len(single) == 128:
                    samples = [single]

            for sample in samples:
                if len(sample) != 128:
                    continue
                sim = cosine_similarity(embedding, sample)
                # Take the BEST match across all stored samples for this person
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

def cmd_enroll_multi(wav_path: str, n_segments: int = 6):
    """
    Extract up to n_segments speaker embeddings from equally-spaced 5-second
    segments of a long WAV recording (ideally 30-35 seconds).
    Returns JSON: {"embeddings": [[...128 floats], ...], "count": N}
    """
    import wave
    import io
    import struct
    try:
        with wave.open(wav_path, "rb") as wf:
            sample_rate = wf.getframerate()
            n_channels = wf.getnchannels()
            raw_bytes = wf.readframes(wf.getnframes())

        # Convert to mono PCM16 bytes if stereo
        if n_channels == 2:
            n_samp = len(raw_bytes) // 2
            stereo = struct.unpack(f'{n_samp}h', raw_bytes)
            mono = [(stereo[i] + stereo[i + 1]) // 2 for i in range(0, n_samp, 2)]
            pcm = struct.pack(f'{len(mono)}h', *mono)
        else:
            pcm = raw_bytes

        total_frames = len(pcm) // 2  # number of int16 samples
        seg_secs = 5
        seg_frames = seg_secs * sample_rate

        if total_frames < sample_rate:  # less than 1 second
            print(json.dumps({"error": "audio too short (minimum 1 second required)"}))
            return

        # Distribute start points evenly across the audio
        actual_n = min(n_segments, max(1, total_frames // seg_frames))
        if actual_n == 1:
            start_frames = [0]
        else:
            last_start = max(0, total_frames - seg_frames)
            step = last_start / (actual_n - 1)
            start_frames = [int(round(i * step)) for i in range(actual_n)]

        asr_model = get_asr_model()
        spk_model = get_spk_model()
        import vosk
        embeddings = []

        for start in start_frames:
            end_frame = min(start + seg_frames, total_frames)
            seg_pcm = pcm[start * 2: end_frame * 2]

            # Build an in-memory WAV for this segment
            wav_buf = io.BytesIO()
            wout = wave.open(wav_buf, "wb")
            wout.setnchannels(1)
            wout.setsampwidth(2)
            wout.setframerate(sample_rate)
            wout.writeframes(seg_pcm)
            wout.close()
            wav_buf.seek(0)

            try:
                rec = vosk.KaldiRecognizer(asr_model, sample_rate)
                rec.SetSpkModel(spk_model)
                rec.SetWords(False)
                CHUNK = 8000
                wseg = wave.open(wav_buf, "rb")
                while True:
                    data = wseg.readframes(CHUNK)
                    if not data:
                        break
                    rec.AcceptWaveform(data)
                wseg.close()
                result = json.loads(rec.FinalResult())
                spk_vec = result.get("spk")
                if spk_vec and len(spk_vec) == 128:
                    embeddings.append(spk_vec)
            except Exception:
                continue  # skip failed segments

        if not embeddings:
            print(json.dumps({"error": "no_voice_detected"}))
            return

        print(json.dumps({"embeddings": embeddings, "count": len(embeddings)}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: vosk_speaker.py extract <wav> | compare <wav> <profiles_json> | enroll_multi <wav> [n_segments]"}))
        sys.exit(1)

    command = sys.argv[1]
    wav_path = sys.argv[2]

    if command == "extract":
        cmd_extract(wav_path)
    elif command == "compare":
        profiles_json = sys.argv[3] if len(sys.argv) > 3 else "[]"
        threshold = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        cmd_compare(wav_path, profiles_json, threshold)
    elif command == "enroll_multi":
        n_seg = int(sys.argv[3]) if len(sys.argv) > 3 else 6
        cmd_enroll_multi(wav_path, n_seg)
    else:
        print(json.dumps({"error": f"unknown command: {command}"}))
        sys.exit(1)

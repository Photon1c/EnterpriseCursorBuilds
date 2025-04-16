import os
import sys
import subprocess
import time
import csv
import json
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# ─── LOAD CONFIG ──────────────────────────────────────────────────────────────
load_dotenv()
with open("settings.json", "r") as f:
    config = json.load(f)

BASE_DIR = config["BASE_DIR"]
STREAM_URL = config["STREAM_URL"]
REPORTS_DIR = os.path.join(BASE_DIR, config["REPORT_SUBDIR"])
RECORD_SECONDS = config.get("RECORD_SECONDS", 30)
INTERVAL_MINUTES = config.get("INTERVAL_MINUTES", 15)
KEYWORDS = config.get("KEYWORDS", [])

TMP_TS = os.path.join(BASE_DIR, "temp_stream.ts")
OUTPUT_WAV = os.path.join(BASE_DIR, "stream_audio.wav")
os.makedirs(REPORTS_DIR, exist_ok=True)

# ─── VISUALS ───────────────────────────────────────────────────────────────────
def show_progress_bar(task_name="Processing", duration=3):
    for _ in tqdm(range(duration), desc=task_name, ncols=75):
        time.sleep(1)

def show_live_timer(seconds):
    for i in range(seconds):
        sys.stdout.write(f"\r🔄 Listening: {i+1:02d}s")
        sys.stdout.flush()
        time.sleep(1)
    print()

# ─── AUDIO CAPTURE ─────────────────────────────────────────────────────────────
def record_stream(stream_url, output_file, duration=30, retries=2):
    for attempt in range(1, retries + 1):
        print(f"[*] Attempt {attempt}: Recording {duration}s of stream...")

        if os.path.exists(TMP_TS):
            os.remove(TMP_TS)

        cmd = ["streamlink", "--hls-duration", str(duration), "-o", TMP_TS, stream_url, "best"]
        subprocess.run(cmd, check=True)

        if not os.path.exists(TMP_TS) or os.path.getsize(TMP_TS) < 200000:
            print("[!] Stream file missing or too small — likely an ad or dead air.")
            continue

        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", TMP_TS,
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_file
        ]

        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("[!] ffmpeg failed:", result.stderr)
            continue

        if os.path.exists(output_file) and os.path.getsize(output_file) > 50000:
            os.remove(TMP_TS)
            print("[*] Recording and conversion complete.")
            return

    raise RuntimeError("❌ All recording attempts failed.")

# ─── TRANSCRIPTION ─────────────────────────────────────────────────────────────
def transcribe_audio(file_path):
    print("[*] Transcribing audio with OpenAI GPT-4o...")
    client = OpenAI()
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=audio_file
        )
    return transcript.text

# ─── TOKEN COUNT ───────────────────────────────────────────────────────────────
def estimate_token_usage(text):
    approx_tokens = int(len(text) / 4)
    print(f"\n🔢 Estimated token usage: ~{approx_tokens} tokens")

# ─── LOGGING ───────────────────────────────────────────────────────────────────
def log_transcription_with_keywords(text):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    keywords_hit = [kw for kw in KEYWORDS if kw.lower() in text.lower()]
    matched_str = ", ".join(keywords_hit) if keywords_hit else ""
    day_stamp = datetime.now().strftime("%Y_%m_%d")
    all_path = os.path.join(REPORTS_DIR, f"all_transcripts_{day_stamp}.csv")
    master_path = os.path.join(REPORTS_DIR, f"master_hits_{day_stamp}.csv")

    with open(all_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if f.tell() == 0:
            writer.writerow(["timestamp", "matched_keywords", "snippet"])
        writer.writerow([timestamp, matched_str, text.strip()])

    if keywords_hit:
        with open(master_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if f.tell() == 0:
                writer.writerow(["timestamp", "matched_keywords", "snippet"])
            writer.writerow([timestamp, matched_str, text.strip()])

        print(r"""
        🐦 CHIRP! Keyword Hit Detected!
        ╔═════════════════════════════╗
        ║    📈 SIGNAL ACQUIRED!     ║
        ╚═════════════════════════════╝
        """)
    else:
        print("🟡 No keywords matched. Logged to general transcript.")

    print("\n📦 Stream Ear Summary")
    print("─────────────────────────────")
    print(f"🕒 Timestamp: {timestamp}")
    print(f"📄 Transcript Length: {len(text)} characters")
    print(f"📁 Reports Saved To: {REPORTS_DIR}")

# ─── LOOP ──────────────────────────────────────────────────────────────────────
def bowr_loop():
    while True:
        try:
            print(f"\n🔄 Listening for {RECORD_SECONDS} seconds...")
            show_live_timer(RECORD_SECONDS)

            record_stream(STREAM_URL, OUTPUT_WAV, duration=RECORD_SECONDS)
            show_progress_bar("Transcribing", duration=3)

            text = transcribe_audio(OUTPUT_WAV)
            estimate_token_usage(text)
            log_transcription_with_keywords(text)

            print("\n📋 Transcript Snippet:\n", text)

        except Exception as e:
            print("❌ Error during cycle:", e)

        print(f"\n⏳ Waiting {INTERVAL_MINUTES} minutes until next sample...\n")
        time.sleep(INTERVAL_MINUTES * 60)

# ─── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    bowr_loop()

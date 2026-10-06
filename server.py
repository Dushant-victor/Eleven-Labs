"""
ElevenLabs Narration Studio - Backend Server
Lightweight Python server using standard library only (no external pip dependencies needed).
Provides static file serving and secure proxying for ElevenLabs API.
"""

import http.server
import json
import os
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

PORT = int(os.environ.get("PORT", 8000))
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# Try loading .env if present
env_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(env_file_path):
    try:
        with open(env_file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    except Exception as e:
        print(f"Notice: Could not parse .env file: {e}")

DEFAULT_MODELS = [
    {
        "model_id": "eleven_multilingual_v2",
        "name": "Eleven Multilingual v2",
        "description": "Cutting-edge multilingual model, 29 languages. Best emotional richness & naturalness.",
        "badge": "Recommended",
        "languages": "29 languages"
    },
    {
        "model_id": "eleven_flash_v2_5",
        "name": "Eleven Flash v2.5",
        "description": "Fastest model with ~75ms latency. Ideal for real-time speech and applications.",
        "badge": "Ultra Fast",
        "languages": "32 languages"
    },
    {
        "model_id": "eleven_turbo_v2_5",
        "name": "Eleven Turbo v2.5",
        "description": "High quality with exceptionally low latency. Great balance of quality & speed.",
        "badge": "Low Latency",
        "languages": "32 languages"
    },
    {
        "model_id": "eleven_flash_v2",
        "name": "Eleven Flash v2",
        "description": "Previous generation ultra-fast model for low-latency multilingual narration.",
        "badge": "Fast",
        "languages": "Multilingual"
    },
    {
        "model_id": "eleven_turbo_v2",
        "name": "Eleven Turbo v2",
        "description": "Previous generation high-speed multilingual model.",
        "badge": "Turbo",
        "languages": "Multilingual"
    },
    {
        "model_id": "eleven_multilingual_v1",
        "name": "Eleven Multilingual v1",
        "description": "Original multilingual model supporting 10 languages.",
        "badge": "Standard",
        "languages": "10 languages"
    },
    {
        "model_id": "eleven_monolingual_v1",
        "name": "Eleven English v1",
        "description": "Original English-only narration model.",
        "badge": "English Only",
        "languages": "English"
    }
]

DEFAULT_VOICES = [
    {
        "voice_id": "JBFqnCBsd6RMkjVDRZzb",
        "name": "George",
        "category": "premade",
        "labels": {"accent": "British / American", "description": "Warm, Captivating Storyteller", "gender": "Male"}
    },
    {
        "voice_id": "pNInz6obpgDQGcFmaJgB",
        "name": "Adam",
        "category": "premade",
        "labels": {"accent": "American", "description": "Dominant, Firm & Narrative", "gender": "Male"}
    },
    {
        "voice_id": "EXAVITQu4vr4xnSDxMaL",
        "name": "Sarah",
        "category": "premade",
        "labels": {"accent": "American", "description": "Mature, Reassuring & Confident", "gender": "Female"}
    },
    {
        "voice_id": "Xb7hH8MSUJpSbSDYk0k2",
        "name": "Alice",
        "category": "premade",
        "labels": {"accent": "British", "description": "Clear, Engaging Educator", "gender": "Female"}
    },
    {
        "voice_id": "nPczCjzI2devNBz1zQrb",
        "name": "Brian",
        "category": "premade",
        "labels": {"accent": "American", "description": "Deep, Resonant & Comforting", "gender": "Male"}
    },
    {
        "voice_id": "IKne3meq5aSn9XLyUdCD",
        "name": "Charlie",
        "category": "premade",
        "labels": {"accent": "Australian", "description": "Deep, Confident & Energetic", "gender": "Male"}
    },
    {
        "voice_id": "cgSgspJ2msm6clMCkdW9",
        "name": "Jessica",
        "category": "premade",
        "labels": {"accent": "American", "description": "Playful, Bright & Warm", "gender": "Female"}
    },
    {
        "voice_id": "CwhRBWXzGAHq8TQ4Fs17",
        "name": "Roger",
        "category": "premade",
        "labels": {"accent": "American", "description": "Laid-Back, Casual & Resonant", "gender": "Male"}
    },
    {
        "voice_id": "onwK4e9ZLuTAKqWW03F9",
        "name": "Daniel",
        "category": "premade",
        "labels": {"accent": "British", "description": "Steady Broadcaster & News", "gender": "Male"}
    },
    {
        "voice_id": "pFZP5JQG7iQjIQuC4Bku",
        "name": "Lily",
        "category": "premade",
        "labels": {"accent": "British", "description": "Velvety Actress & Expressive", "gender": "Female"}
    },
    {
        "voice_id": "pqHfZKP75CvOlQylNhV4",
        "name": "Bill",
        "category": "premade",
        "labels": {"accent": "American", "description": "Wise, Mature & Balanced", "gender": "Male"}
    },
    {
        "voice_id": "cjVigY5qzO86Huf0OWal",
        "name": "Eric",
        "category": "premade",
        "labels": {"accent": "American", "description": "Smooth & Trustworthy", "gender": "Male"}
    },
    {
        "voice_id": "bIHbv24MWmeRgasZH58o",
        "name": "Will",
        "category": "premade",
        "labels": {"accent": "American", "description": "Relaxed Optimist", "gender": "Male"}
    }
]


class ElevenLabsProxyHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that serves files and proxies ElevenLabs requests."""
    protocol_version = "HTTP/1.0"

    def end_headers(self):
        # Enable CORS for local development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, xi-api-key, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == "/api/health":
            env_key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("XI_API_KEY")
            has_env = bool(env_key and env_key.strip())
            preview = f"{env_key[:7]}...{env_key[-4:]}" if has_env and len(env_key) > 12 else None
            self.send_json_response(200, {
                "status": "online",
                "has_env_key": has_env,
                "key_preview": preview
            })
            return

        if parsed.path == "/api/models":
            self.handle_get_models()
            return

        if parsed.path == "/api/voices":
            self.handle_get_voices()
            return

        # Serve static files from workspace root
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/tts":
            self.handle_tts()
            return

        if parsed.path == "/api/save-key":
            self.handle_save_key()
            return

        self.send_json_response(404, {"error": "Not Found"})

    def get_api_key(self, request_headers, request_data=None):
        # 1. Check request header
        key = request_headers.get("xi-api-key")
        if key and key.strip() and key.strip() != "env_configured":
            return key.strip()

        # 2. Check JSON payload
        if request_data and isinstance(request_data, dict):
            key = request_data.get("api_key")
            if key and key.strip() and key.strip() != "env_configured":
                return key.strip()

        # 3. Check environment variables
        env_key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("XI_API_KEY")
        if env_key and env_key.strip():
            return env_key.strip()

        return None

    def handle_get_models(self):
        api_key = self.get_api_key(self.headers)
        
        # If user has provided an API key, we can try to fetch live models from ElevenLabs
        if api_key:
            try:
                req = urllib.request.Request(
                    f"{ELEVENLABS_API_URL}/models",
                    headers={"xi-api-key": api_key, "Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    models_data = json.loads(response.read().decode("utf-8"))
                    self.send_json_response(200, {"models": models_data, "source": "elevenlabs_api"})
                    return
            except Exception as e:
                # Fallback to default list if API fails
                pass

        # Return default curated models
        self.send_json_response(200, {"models": DEFAULT_MODELS, "source": "default_curated"})

    def handle_get_voices(self):
        api_key = self.get_api_key(self.headers)

        if api_key:
            try:
                req = urllib.request.Request(
                    f"{ELEVENLABS_API_URL}/voices",
                    headers={"xi-api-key": api_key, "Accept": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=8) as response:
                    voices_data = json.loads(response.read().decode("utf-8"))
                    self.send_json_response(200, {"voices": voices_data.get("voices", []), "source": "elevenlabs_api"})
                    return
            except Exception as e:
                pass

        self.send_json_response(200, {"voices": DEFAULT_VOICES, "source": "default_curated"})

    def handle_tts(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self.send_json_response(400, {"error": "Missing request body"})
                return

            raw_body = self.rfile.read(content_length).decode("utf-8")
            body_data = json.loads(raw_body)

            text = body_data.get("text", "").strip()
            if not text:
                self.send_json_response(400, {"error": "No text provided for narration"})
                return

            model_id = body_data.get("model_id", "eleven_multilingual_v2")
            voice_id = body_data.get("voice_id", "JBFqnCBsd6RMkjVDRZzb")  # Default to George (Warm Storyteller)
            api_key = self.get_api_key(self.headers, body_data)

            if not api_key:
                self.send_json_response(401, {
                    "error": "ElevenLabs API Key required",
                    "code": "missing_api_key",
                    "message": "Please enter your ElevenLabs API key in the studio settings to start narration."
                })
                return

            # Prepare ElevenLabs payload
            payload = {
                "text": text,
                "model_id": model_id,
                "voice_settings": body_data.get("voice_settings", {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True
                })
            }

            target_url = f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}"
            
            headers = {
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg"
            }

            req = urllib.request.Request(
                target_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=45) as resp:
                    audio_content = resp.read()
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "audio/mpeg")
                    self.send_header("Content-Length", str(len(audio_content)))
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    self.wfile.write(audio_content)

            except urllib.error.HTTPError as he:
                error_response = he.read().decode("utf-8", errors="replace")
                print(f"[ElevenLabs API Error {he.code}]: {error_response}")
                try:
                    error_json = json.loads(error_response)
                except Exception:
                    error_json = {"detail": {"message": error_response}}

                self.send_json_response(he.code, {
                    "error": "ElevenLabs API returned an error",
                    "status_code": he.code,
                    "details": error_json
                })

            except urllib.error.URLError as ue:
                self.send_json_response(503, {
                    "error": "Failed to connect to ElevenLabs API server",
                    "message": str(ue.reason)
                })

        except Exception as e:
            print(f"[Internal Error]: {e}")
            self.send_json_response(500, {"error": "Server error", "message": str(e)})

    def handle_save_key(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            body_data = json.loads(raw_body)
            key = body_data.get("api_key", "").strip()

            if key:
                # Update runtime environment variable
                os.environ["ELEVENLABS_API_KEY"] = key
                
                # Persist to .env file in workspace
                with open(env_file_path, "w", encoding="utf-8") as f:
                    f.write(f"ELEVENLABS_API_KEY={key}\n")

                self.send_json_response(200, {"success": True, "message": "API Key saved successfully in .env"})
            else:
                self.send_json_response(400, {"error": "No API key provided"})
        except Exception as e:
            self.send_json_response(500, {"error": "Failed to save key", "message": str(e)})

    def send_json_response(self, code, data):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)


class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


def run_server(port=PORT):
    server_address = ("", port)
    try:
        httpd = ThreadedTCPServer(server_address, ElevenLabsProxyHandler)
        print("=" * 65)
        print(" ElevenLabs Narration Studio Server Running")
        print(f" Access URL: http://localhost:{port}")
        print(" API Proxy Endpoints: /api/tts, /api/models, /api/voices")
        print("=" * 65)
        httpd.serve_forever()
    except OSError as e:
        if port < 8020:
            print(f"Port {port} busy, trying {port + 1}...")
            run_server(port + 1)
        else:
            print(f"Failed to bind port: {e}")
            sys.exit(1)


if __name__ == "__main__":
    run_server()

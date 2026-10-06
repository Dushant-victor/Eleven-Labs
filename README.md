# 🎙️ ElevenLabs AI Voice Studio

A state-of-the-art web application powered by the **ElevenLabs Text-to-Speech API**. Transform any written text or story into lifelike neural narration using ElevenLabs' industry-leading AI models.

---

## ✨ Features

- **Model Selection Dropdown**: Easily select between ElevenLabs narration models:
  - `Eleven Multilingual v2` (Recommended, 29 languages, highest emotional richness)
  - `Eleven Flash v2.5` (Ultra-low latency ~75ms, 32 languages)
  - `Eleven Turbo v2.5` (High fidelity, low latency, 32 languages)
  - `Eleven Flash v2` (Fast multilingual)
  - `Eleven Turbo v2` (High-speed multilingual)
  - `Eleven Multilingual v1` (Classic multilingual)
  - `Eleven English v1` (Classic English)
- **Rich Text Input Field**: Type or paste any story, article, or dialogue with character, word, and estimated audio duration counters.
- **Sample Presets**: 1-click sample scripts (Cinematic Story, Tech Showcase, News Brief, Philosophical Quote).
- **Narrator Voice Selector**: Choose from popular ElevenLabs voices (Rachel, Adam, Antoni, Bella, Domi, Josh, Arnold, Sam, Elli).
- **Fine-Tuning Controls**: Adjust voice stability and clarity / similarity sliders.
- **Dynamic Play Button**:
  - Click to convert text to speech and start narration immediately.
  - Interactive states: Generating with glowing spinner, playing with pause toggle, and resume.
- **Live Soundwave Visualizer**: Real-time animated canvas waveform synchronized with playback.
- **Audio Scrubber & Controls**: Custom seek bar, timestamp display, volume control, mute, and speed selector (0.75x, 1x, 1.25x, 1.5x).
- **MP3 Download**: Download generated narration with 1 click.
- **Generation History**: Re-listen to or copy past narrations in the current session.
- **Zero External Dependencies**: Powered by Python's built-in standard library (no pip packages or npm installs required).

---

## 🚀 Quick Start

### 1. Launch the Server
Double-click `start.bat` or run in terminal / PowerShell:

```bash
python server.py
```

The server will start at:
👉 **[http://localhost:8000](http://localhost:8000)**

### 2. Enter Your ElevenLabs API Key
1. Click the **API Key** button in the top right of the studio.
2. Enter your ElevenLabs API Key (`xi-api-key`). If you do not have one, get a free key at [ElevenLabs](https://elevenlabs.io).
3. Click **Save & Apply** (or save it in a `.env` file as `ELEVENLABS_API_KEY=your_key`).

### 3. Generate Speech
1. **Enter or paste text** into the input field (or click one of the sample prompt chips).
2. **Select an ElevenLabs model** from the dropdown menu.
3. **Click the Play button**.
4. The selected ElevenLabs model will narrate the entered text!

/**
 * ElevenLabs Voice Studio - Application Logic
 * Implements Text-to-Speech synthesis, model selection, audio playback,
 * live soundwave visualizer, and API key management.
 */

// Global Application State
const state = {
  apiKey: localStorage.getItem('elevenlabs_api_key') || '',
  selectedModel: 'eleven_multilingual_v2',
  selectedVoice: 'JBFqnCBsd6RMkjVDRZzb',
  audioBlob: null,
  audioUrl: null,
  audioElement: null,
  isPlaying: false,
  isLoading: false,
  audioDuration: 0,
  audioContext: null,
  analyser: null,
  sourceNode: null,
  animationFrameId: null,
  lastTextNarrated: '',
  lastModelNarrated: '',
  lastVoiceNarrated: '',
  history: JSON.parse(localStorage.getItem('elevenlabs_history') || '[]')
};

// Model Metadata
const MODEL_DETAILS = {
  eleven_multilingual_v2: {
    name: 'Eleven Multilingual v2',
    badge: 'Recommended',
    description: 'Cutting-edge multilingual model with unmatched emotional depth, cadence, and 29 languages.'
  },
  eleven_flash_v2_5: {
    name: 'Eleven Flash v2.5',
    badge: 'Ultra Fast',
    description: 'Extreme low-latency model (~75ms). Perfect for real-time applications and rapid conversational agents.'
  },
  eleven_turbo_v2_5: {
    name: 'Eleven Turbo v2.5',
    badge: 'Low Latency',
    description: 'Optimal balance of high-fidelity audio quality and low latency across 32 languages.'
  },
  eleven_flash_v2: {
    name: 'Eleven Flash v2',
    badge: 'Fast',
    description: 'High-speed multilingual synthesis for conversational workflows.'
  },
  eleven_turbo_v2: {
    name: 'Eleven Turbo v2',
    badge: 'Turbo',
    description: 'Optimized for high-throughput multilingual speech generation.'
  },
  eleven_multilingual_v1: {
    name: 'Eleven Multilingual v1',
    badge: 'Standard',
    description: 'Original multilingual generation model supporting 10 languages.'
  },
  eleven_monolingual_v1: {
    name: 'Eleven English v1',
    badge: 'English Only',
    description: 'Classic first-generation English-only voice synthesis model.'
  }
};

// Voice Details
const VOICE_DETAILS = {
  'JBFqnCBsd6RMkjVDRZzb': { name: 'George', gender: 'Male • Storyteller', tags: ['British/American', 'Warm', 'Narrative'] },
  'pNInz6obpgDQGcFmaJgB': { name: 'Adam', gender: 'Male • Deep', tags: ['American', 'Dominant', 'Firm'] },
  'EXAVITQu4vr4xnSDxMaL': { name: 'Sarah', gender: 'Female • Confident', tags: ['American', 'Mature', 'Reassuring'] },
  'Xb7hH8MSUJpSbSDYk0k2': { name: 'Alice', gender: 'Female • Educator', tags: ['British', 'Clear', 'Engaging'] },
  'nPczCjzI2devNBz1zQrb': { name: 'Brian', gender: 'Male • Resonant', tags: ['American', 'Deep', 'Comforting'] },
  'IKne3meq5aSn9XLyUdCD': { name: 'Charlie', gender: 'Male • Energetic', tags: ['Australian', 'Deep', 'Confident'] },
  'cgSgspJ2msm6clMCkdW9': { name: 'Jessica', gender: 'Female • Bright', tags: ['American', 'Playful', 'Warm'] },
  'CwhRBWXzGAHq8TQ4Fs17': { name: 'Roger', gender: 'Male • Casual', tags: ['American', 'Laid-Back', 'Resonant'] },
  'onwK4e9ZLuTAKqWW03F9': { name: 'Daniel', gender: 'Male • Broadcaster', tags: ['British', 'Steady', 'News'] },
  'pFZP5JQG7iQjIQuC4Bku': { name: 'Lily', gender: 'Female • Actress', tags: ['British', 'Velvety', 'Expressive'] },
  'pqHfZKP75CvOlQylNhV4': { name: 'Bill', gender: 'Male • Balanced', tags: ['American', 'Wise', 'Mature'] },
  'cjVigY5qzO86Huf0OWal': { name: 'Eric', gender: 'Male • Smooth', tags: ['American', 'Smooth', 'Trustworthy'] },
  'bIHbv24MWmeRgasZH58o': { name: 'Will', gender: 'Male • Optimist', tags: ['American', 'Relaxed', 'Friendly'] }
};

// Sample Prompts
const SAMPLES = {
  story: "In the quiet corners of the ancient library, dusty amber light filtered through high stained glass windows. Leo turned the fragile parchment page, unaware that the whisper he just heard came not from the evening breeze, but from the words themselves.",
  tech: "Introducing the next frontier in neural voice synthesis. Powered by deep learning architectures, ElevenLabs transforms plain text into speech imbued with genuine emotional resonance, natural pauses, and human cadence.",
  news: "Good morning. In global developments today, researchers have unveiled an unprecedented breakthrough in clean energy technology, with field trials showing a remarkable fifty percent increase in renewable grid storage efficiency.",
  quote: "The future belongs to those who learn more skills and combine them in creative ways. Clear speech and articulate ideas are the bridges that turn imagination into reality."
};

// DOM Elements
const DOM = {
  modelSelect: document.getElementById('model-select'),
  modelBadge: document.getElementById('selected-model-badge'),
  modelDesc: document.getElementById('model-description'),
  voiceSelect: document.getElementById('voice-select'),
  voiceGender: document.getElementById('selected-voice-gender'),
  voiceTags: document.getElementById('voice-quick-tags'),
  textInput: document.getElementById('text-input'),
  charCount: document.getElementById('char-count'),
  wordCount: document.getElementById('word-count'),
  estDuration: document.getElementById('est-duration'),
  btnClearText: document.getElementById('btn-clear-text'),
  btnPlay: document.getElementById('btn-play'),
  btnPlayText: document.getElementById('btn-play-text'),
  iconPlay: document.getElementById('icon-play'),
  iconPause: document.getElementById('icon-pause'),
  iconSpinner: document.getElementById('icon-spinner'),
  btnStop: document.getElementById('btn-stop'),
  metaIndicator: document.getElementById('meta-indicator'),
  metaMessage: document.getElementById('meta-message'),
  playerPanel: document.getElementById('player-panel'),
  playerTrackTitle: document.getElementById('player-track-title'),
  playerTrackSubtitle: document.getElementById('player-track-subtitle'),
  nativeAudio: document.getElementById('native-audio'),
  waveformCanvas: document.getElementById('waveform-canvas'),
  seekSlider: document.getElementById('seek-slider'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  currentTime: document.getElementById('current-time'),
  totalTime: document.getElementById('total-time'),
  volumeSlider: document.getElementById('volume-slider'),
  btnMute: document.getElementById('btn-mute'),
  iconVolumeHigh: document.getElementById('icon-volume-high'),
  iconVolumeMuted: document.getElementById('icon-volume-muted'),
  btnDownload: document.getElementById('btn-download'),
  btnOpenApiModal: document.getElementById('btn-open-api-modal'),
  apiKeyIndicator: document.getElementById('api-key-indicator'),
  apiKeyButtonLabel: document.getElementById('api-key-button-label'),
  modalApiKey: document.getElementById('modal-api-key'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  inputApiKey: document.getElementById('input-api-key'),
  btnToggleKeyVisibility: document.getElementById('btn-toggle-key-visibility'),
  iconEyeShow: document.getElementById('icon-eye-show'),
  iconEyeHide: document.getElementById('icon-eye-hide'),
  btnSaveKey: document.getElementById('btn-save-key'),
  btnClearKey: document.getElementById('btn-clear-key'),
  btnTestKey: document.getElementById('btn-test-key'),
  toastContainer: document.getElementById('toast-container'),
  historyList: document.getElementById('history-list'),
  historyEmpty: document.getElementById('history-empty'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnToggleAdvanced: document.getElementById('btn-toggle-advanced'),
  advancedPanel: document.getElementById('advanced-panel'),
  sliderStability: document.getElementById('slider-stability'),
  valStability: document.getElementById('val-stability'),
  sliderSimilarity: document.getElementById('slider-similarity'),
  valSimilarity: document.getElementById('val-similarity'),
  serverStatus: document.getElementById('server-status')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initAudio();
  initVisualizer();
  checkServerHealth();
  renderHistory();
});

function initUI() {
  // Model Select Change
  DOM.modelSelect.addEventListener('change', handleModelChange);

  // Voice Select Change
  DOM.voiceSelect.addEventListener('change', handleVoiceChange);

  // Text Input Changes
  DOM.textInput.addEventListener('input', updateTextMetrics);
  DOM.btnClearText.addEventListener('click', () => {
    DOM.textInput.value = '';
    updateTextMetrics();
    DOM.textInput.focus();
  });

  // Sample prompt pills
  document.querySelectorAll('.sample-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      const type = e.currentTarget.getAttribute('data-sample');
      if (SAMPLES[type]) {
        DOM.textInput.value = SAMPLES[type];
        updateTextMetrics();
        showToast('Sample text inserted', 'info');
      }
    });
  });

  // Advanced dynamics accordion toggle
  DOM.btnToggleAdvanced.addEventListener('click', () => {
    const isExpanded = DOM.btnToggleAdvanced.getAttribute('aria-expanded') === 'true';
    DOM.btnToggleAdvanced.setAttribute('aria-expanded', !isExpanded);
    DOM.advancedPanel.classList.toggle('collapsed', isExpanded);
  });

  // Stability slider
  DOM.sliderStability.addEventListener('input', (e) => {
    DOM.valStability.textContent = `${e.target.value}%`;
  });

  // Similarity slider
  DOM.sliderSimilarity.addEventListener('input', (e) => {
    DOM.valSimilarity.textContent = `${e.target.value}%`;
  });

  // Primary Play Button Click
  DOM.btnPlay.addEventListener('click', handlePlayClick);

  // Stop Button Click
  DOM.btnStop.addEventListener('click', handleStopClick);

  // Download Button Click
  DOM.btnDownload.addEventListener('click', handleDownload);

  // API Key Modal Events
  DOM.btnOpenApiModal.addEventListener('click', openApiKeyModal);
  DOM.btnCloseModal.addEventListener('click', closeApiKeyModal);
  DOM.modalApiKey.addEventListener('click', (e) => {
    if (e.target === DOM.modalApiKey) closeApiKeyModal();
  });

  // Password visibility toggle
  DOM.btnToggleKeyVisibility.addEventListener('click', () => {
    const isPassword = DOM.inputApiKey.type === 'password';
    DOM.inputApiKey.type = isPassword ? 'text' : 'password';
    DOM.iconEyeShow.classList.toggle('hidden', isPassword);
    DOM.iconEyeHide.classList.toggle('hidden', !isPassword);
  });

  // API Key Save & Clear
  DOM.btnSaveKey.addEventListener('click', saveApiKey);
  DOM.btnClearKey.addEventListener('click', clearApiKey);
  DOM.btnTestKey.addEventListener('click', testApiKey);

  // History Clear
  DOM.btnClearHistory.addEventListener('click', clearHistory);

  // Speed Buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const speed = parseFloat(e.currentTarget.getAttribute('data-speed'));
      if (DOM.nativeAudio) {
        DOM.nativeAudio.playbackRate = speed;
      }
    });
  });

  // Update UI with initial API key status
  updateApiKeyDisplay();
}

function handleModelChange() {
  const modelId = DOM.modelSelect.value;
  state.selectedModel = modelId;
  const info = MODEL_DETAILS[modelId] || { badge: 'Model', description: '' };
  
  DOM.modelBadge.textContent = info.badge;
  DOM.modelDesc.textContent = info.description;
}

function handleVoiceChange() {
  const voiceId = DOM.voiceSelect.value;
  state.selectedVoice = voiceId;
  const info = VOICE_DETAILS[voiceId] || { gender: 'Custom Voice', tags: ['AI Voice'] };

  DOM.voiceGender.textContent = info.gender;
  DOM.voiceTags.innerHTML = info.tags.map(t => `<span class="tag">${t}</span>`).join('');
}

function updateTextMetrics() {
  const text = DOM.textInput.value.trim();
  const chars = text.length;
  const words = text ? text.split(/\s+/).length : 0;
  
  DOM.charCount.textContent = chars.toLocaleString();
  DOM.wordCount.textContent = words.toLocaleString();

  // Estimate duration: ~150 words per minute -> 2.5 words per second
  const totalSeconds = Math.ceil(words / 2.5);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  DOM.estDuration.textContent = `~${minutes}:${seconds.toString().padStart(2, '0')} est. audio`;
}

// Audio Engine Setup
function initAudio() {
  state.audioElement = DOM.nativeAudio;

  // Audio Events
  state.audioElement.addEventListener('timeupdate', () => {
    if (!state.audioElement.duration) return;
    const current = state.audioElement.currentTime;
    const duration = state.audioElement.duration;
    
    DOM.currentTime.textContent = formatTime(current);
    DOM.totalTime.textContent = formatTime(duration);

    const progress = (current / duration) * 100;
    DOM.seekSlider.value = progress;
    DOM.progressBarFill.style.width = `${progress}%`;
  });

  state.audioElement.addEventListener('play', () => {
    state.isPlaying = true;
    setPlayButtonState('playing');
    setPlaybackMeta('active', 'Speaking with ElevenLabs neural model...');
  });

  state.audioElement.addEventListener('pause', () => {
    state.isPlaying = false;
    setPlayButtonState('paused');
    setPlaybackMeta('idle', 'Narration paused');
  });

  state.audioElement.addEventListener('ended', () => {
    state.isPlaying = false;
    setPlayButtonState('idle');
    setPlaybackMeta('idle', 'Narration finished');
    DOM.seekSlider.value = 0;
    DOM.progressBarFill.style.width = '0%';
  });

  state.audioElement.addEventListener('loadedmetadata', () => {
    DOM.totalTime.textContent = formatTime(state.audioElement.duration);
    DOM.seekSlider.value = 0;
    DOM.progressBarFill.style.width = '0%';
  });

  // Scrubber events
  DOM.seekSlider.addEventListener('input', (e) => {
    if (!state.audioElement.duration) return;
    const seekTo = (e.target.value / 100) * state.audioElement.duration;
    state.audioElement.currentTime = seekTo;
    DOM.progressBarFill.style.width = `${e.target.value}%`;
  });

  // Volume slider
  DOM.volumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    state.audioElement.volume = vol;
    updateVolumeIcon(vol);
  });

  // Mute button
  DOM.btnMute.addEventListener('click', () => {
    if (state.audioElement.volume > 0) {
      state.lastVolume = state.audioElement.volume;
      state.audioElement.volume = 0;
      DOM.volumeSlider.value = 0;
    } else {
      const restore = state.lastVolume || 1;
      state.audioElement.volume = restore;
      DOM.volumeSlider.value = restore;
    }
    updateVolumeIcon(state.audioElement.volume);
  });
}

function updateVolumeIcon(vol) {
  const isMuted = vol === 0;
  DOM.iconVolumeHigh.classList.toggle('hidden', isMuted);
  DOM.iconVolumeMuted.classList.toggle('hidden', !isMuted);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Visualizer Setup using Canvas & Web Audio API
function initVisualizer() {
  const canvas = DOM.waveformCanvas;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
    canvas.height = 70 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function draw() {
    state.animationFrameId = requestAnimationFrame(draw);

    const width = canvas.parentElement.clientWidth;
    const height = 70;
    ctx.clearRect(0, 0, width, height);

    const barCount = 48;
    const barWidth = 4;
    const gap = (width - (barCount * barWidth)) / (barCount - 1);

    if (state.isPlaying) {
      // Dynamic animated wave bars
      const time = performance.now() * 0.005;
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        // Harmonic variation to make natural vocal wave pattern
        const sinVal = Math.sin(i * 0.25 + time) * Math.cos(i * 0.15 - time);
        const rand = Math.sin(i * 3 + time * 2) * 0.2;
        const normalized = Math.max(0.12, Math.min(0.95, Math.abs(sinVal) + rand));
        const barHeight = normalized * (height - 14);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(0.5, '#a855f7');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    } else {
      // Gentle idle state
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const barHeight = 4;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    }
  }

  draw();
}

// Core Narration Handler (When Play is clicked)
async function handlePlayClick() {
  const text = DOM.textInput.value.trim();
  const currentModel = DOM.modelSelect.value;
  const currentVoice = DOM.voiceSelect.value;

  // Validation: Check if text is present
  if (!text) {
    showToast('Please type or paste some text before starting narration', 'error');
    DOM.textInput.focus();
    return;
  }

  // If audio is already synthesized for the exact same text, model, and voice: toggle play/pause!
  if (state.audioUrl && 
      state.lastTextNarrated === text && 
      state.lastModelNarrated === currentModel && 
      state.lastVoiceNarrated === currentVoice) {
    if (state.isPlaying) {
      state.audioElement.pause();
    } else {
      state.audioElement.play().catch(err => {
        console.warn('Audio play interrupted:', err);
      });
    }
    return;
  }

  // If no API key configured, prompt the user smoothly
  if (!state.apiKey) {
    showToast('ElevenLabs API key is required to synthesize voice', 'error');
    openApiKeyModal();
    return;
  }

  // Start Synthesis
  startSynthesis(text, currentModel, currentVoice);
}

async function startSynthesis(text, modelId, voiceId) {
  state.isLoading = true;
  setPlayButtonState('loading');
  setPlaybackMeta('loading', `Connecting to ElevenLabs (${MODEL_DETAILS[modelId]?.name || modelId})...`);
  DOM.btnStop.disabled = true;

  try {
    const stability = parseInt(DOM.sliderStability.value, 10) / 100;
    const similarity = parseInt(DOM.sliderSimilarity.value, 10) / 100;

    const payload = {
      text: text,
      model_id: modelId,
      voice_id: voiceId,
      api_key: state.apiKey,
      voice_settings: {
        stability: stability,
        similarity_boost: similarity,
        style: 0.0,
        use_speaker_boost: true
      }
    };

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': state.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const detailMsg = errorJson?.details?.detail?.message || 
                        errorJson?.message || 
                        errorJson?.error || 
                        `HTTP error ${response.status}`;

      if (response.status === 401) {
        showToast('Invalid ElevenLabs API key. Please check your key.', 'error');
        openApiKeyModal();
      } else {
        showToast(`ElevenLabs Error: ${detailMsg}`, 'error');
      }

      setPlayButtonState('idle');
      setPlaybackMeta('error', `Synthesis failed (${response.status})`);
      state.isLoading = false;
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Save generated audio to state
    state.audioBlob = audioBlob;
    state.audioUrl = audioUrl;
    state.lastTextNarrated = text;
    state.lastModelNarrated = modelId;
    state.lastVoiceNarrated = voiceId;

    // Load into audio element and play
    state.audioElement.src = audioUrl;
    state.audioElement.load();
    await state.audioElement.play().catch(e => console.log('Autoplay handled:', e));

    // Update Player UI
    const modelName = MODEL_DETAILS[modelId]?.name || modelId;
    const voiceName = VOICE_DETAILS[voiceId]?.name || voiceId;

    DOM.playerTrackTitle.textContent = `Narration by ${voiceName}`;
    DOM.playerTrackSubtitle.textContent = `Model: ${modelName} • Voice: ${voiceName}`;
    DOM.playerPanel.classList.add('visible');
    DOM.btnStop.disabled = false;

    // Save to history
    saveToHistory({
      id: Date.now().toString(),
      textSnippet: text.length > 85 ? text.substring(0, 85) + '...' : text,
      fullText: text,
      modelId: modelId,
      modelName: modelName,
      voiceId: voiceId,
      voiceName: voiceName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audioBlob: audioBlob
    });

    showToast(`Narration generated with ${modelName}!`, 'success');
  } catch (error) {
    console.error('TTS Request failed:', error);
    showToast(`Error: ${error.message || 'Could not connect to server'}`, 'error');
    setPlaybackMeta('error', 'Network error');
    setPlayButtonState('idle');
  } finally {
    state.isLoading = false;
  }
}

function handleStopClick() {
  if (state.audioElement) {
    state.audioElement.pause();
    state.audioElement.currentTime = 0;
  }
  state.isPlaying = false;
  setPlayButtonState('idle');
  setPlaybackMeta('idle', 'Playback stopped');
}

function handleDownload() {
  if (!state.audioBlob) {
    showToast('No audio generated to download', 'error');
    return;
  }

  const modelId = state.lastModelNarrated || 'elevenlabs';
  const voiceId = VOICE_DETAILS[state.lastVoiceNarrated]?.name || 'narration';
  const filename = `elevenlabs_${modelId}_${voiceId}_${Date.now()}.mp3`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(state.audioBlob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('MP3 downloaded successfully!', 'success');
}

// UI State Helpers
function setPlayButtonState(status) {
  if (status === 'loading') {
    DOM.btnPlay.classList.add('loading');
    DOM.btnPlay.classList.remove('playing');
    DOM.iconPlay.classList.add('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.iconSpinner.classList.remove('hidden');
    DOM.btnPlayText.textContent = 'Generating Voice...';
  } else if (status === 'playing') {
    DOM.btnPlay.classList.remove('loading');
    DOM.btnPlay.classList.add('playing');
    DOM.iconPlay.classList.add('hidden');
    DOM.iconPause.classList.remove('hidden');
    DOM.iconSpinner.classList.add('hidden');
    DOM.btnPlayText.textContent = 'Pause Narration';
  } else if (status === 'paused') {
    DOM.btnPlay.classList.remove('loading', 'playing');
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.iconSpinner.classList.add('hidden');
    DOM.btnPlayText.textContent = 'Resume Narration';
  } else {
    // idle
    DOM.btnPlay.classList.remove('loading', 'playing');
    DOM.iconPlay.classList.remove('hidden');
    DOM.iconPause.classList.add('hidden');
    DOM.iconSpinner.classList.add('hidden');
    DOM.btnPlayText.textContent = 'Play Narration';
  }
}

function setPlaybackMeta(type, message) {
  DOM.metaIndicator.className = 'meta-indicator ' + type;
  DOM.metaMessage.textContent = message;
}

// API Key Management
function openApiKeyModal() {
  DOM.inputApiKey.value = state.apiKey;
  DOM.modalApiKey.classList.remove('hidden');
  DOM.inputApiKey.focus();
}

function closeApiKeyModal() {
  DOM.modalApiKey.classList.add('hidden');
}

async function saveApiKey() {
  const key = DOM.inputApiKey.value.trim();
  if (!key) {
    showToast('Please enter an API key', 'error');
    return;
  }

  state.apiKey = key;
  localStorage.setItem('elevenlabs_api_key', key);
  updateApiKeyDisplay();

  // Try notifying backend server to persist in .env if available
  try {
    await fetch('/api/save-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key })
    });
  } catch (e) {
    // Local storage is sufficient if server save fails
  }

  showToast('API Key saved and active!', 'success');
  closeApiKeyModal();
}

function clearApiKey() {
  state.apiKey = '';
  localStorage.removeItem('elevenlabs_api_key');
  DOM.inputApiKey.value = '';
  updateApiKeyDisplay();
  showToast('API Key removed', 'info');
  closeApiKeyModal();
}

async function testApiKey() {
  const key = DOM.inputApiKey.value.trim();
  if (!key) {
    showToast('Enter an API key to test', 'error');
    return;
  }

  DOM.btnTestKey.textContent = 'Verifying...';
  DOM.btnTestKey.disabled = true;

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/models', {
      headers: { 'xi-api-key': key }
    });

    if (res.ok) {
      showToast('API Key verified successfully with ElevenLabs!', 'success');
    } else {
      showToast(`Verification failed: Status ${res.status}`, 'error');
    }
  } catch (e) {
    // If browser CORS restricts direct test, try server proxy
    try {
      const proxyRes = await fetch('/api/models', {
        headers: { 'xi-api-key': key }
      });
      if (proxyRes.ok) {
        showToast('API Key verified via local proxy!', 'success');
      } else {
        showToast('Failed to verify API key with ElevenLabs', 'error');
      }
    } catch (err) {
      showToast('Could not reach ElevenLabs API', 'error');
    }
  } finally {
    DOM.btnTestKey.textContent = 'Test Connection';
    DOM.btnTestKey.disabled = false;
  }
}

function updateApiKeyDisplay() {
  const isConfigured = Boolean(state.apiKey);
  DOM.apiKeyIndicator.className = `key-status-dot ${isConfigured ? 'configured' : 'unconfigured'}`;
  
  if (state.keyPreview) {
    DOM.apiKeyButtonLabel.textContent = `Key Active (${state.keyPreview})`;
  } else if (state.apiKey && state.apiKey !== 'env_configured') {
    const preview = `${state.apiKey.substring(0, 6)}...${state.apiKey.substring(state.apiKey.length - 4)}`;
    DOM.apiKeyButtonLabel.textContent = `Key Active (${preview})`;
  } else if (isConfigured) {
    DOM.apiKeyButtonLabel.textContent = 'Key Active';
  } else {
    DOM.apiKeyButtonLabel.textContent = 'API Key';
  }
}

// Server Health Check
async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      DOM.serverStatus.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-label">Server Online</span>
      `;
      // If server already has key from .env
      if (data.has_env_key) {
        state.apiKey = state.apiKey || 'env_configured';
        state.keyPreview = data.key_preview;
        updateApiKeyDisplay();
        if (data.key_preview && !DOM.inputApiKey.value) {
          DOM.inputApiKey.placeholder = data.key_preview;
        }
      }
    }
  } catch (e) {
    DOM.serverStatus.innerHTML = `
      <span class="status-dot" style="background: #f59e0b; box-shadow: 0 0 10px #f59e0b"></span>
      <span class="status-label" style="color: #fcd34d">Standalone</span>
    `;
  }
}

// History Handling
function saveToHistory(item) {
  // Store metadata
  state.history.unshift({
    id: item.id,
    textSnippet: item.textSnippet,
    fullText: item.fullText,
    modelId: item.modelId,
    modelName: item.modelName,
    voiceId: item.voiceId,
    voiceName: item.voiceName,
    timestamp: item.timestamp
  });

  // Keep last 8 items
  if (state.history.length > 8) state.history.pop();
  localStorage.setItem('elevenlabs_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    DOM.historyEmpty.style.display = 'block';
    DOM.historyList.innerHTML = '';
    DOM.historyList.appendChild(DOM.historyEmpty);
    return;
  }

  DOM.historyEmpty.style.display = 'none';
  DOM.historyList.innerHTML = '';

  state.history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-item-left">
        <button type="button" class="btn-history-play" data-id="${item.id}" title="Load and replay this narration">
          <svg class="icon-xs" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4"/>
          </svg>
        </button>
        <div class="history-item-details">
          <p class="history-item-text">${escapeHtml(item.textSnippet)}</p>
          <div class="history-item-meta">
            <span>${item.modelName}</span>
            <span>•</span>
            <span>${item.voiceName}</span>
            <span>•</span>
            <span>${item.timestamp}</span>
          </div>
        </div>
      </div>
      <div class="history-item-actions">
        <button type="button" class="btn-text-ghost btn-copy-text" data-text="${encodeURIComponent(item.fullText)}" title="Copy text to input">
          Copy Text
        </button>
      </div>
    `;

    // Attach events
    el.querySelector('.btn-history-play').addEventListener('click', () => {
      DOM.textInput.value = item.fullText;
      updateTextMetrics();
      DOM.modelSelect.value = item.modelId;
      handleModelChange();
      DOM.voiceSelect.value = item.voiceId;
      handleVoiceChange();
      handlePlayClick();
    });

    el.querySelector('.btn-copy-text').addEventListener('click', (e) => {
      const rawText = decodeURIComponent(e.currentTarget.getAttribute('data-text'));
      DOM.textInput.value = rawText;
      updateTextMetrics();
      showToast('Text copied into studio input', 'info');
      DOM.textInput.scrollIntoView({ behavior: 'smooth' });
    });

    DOM.historyList.appendChild(el);
  });
}

function clearHistory() {
  state.history = [];
  localStorage.removeItem('elevenlabs_history');
  renderHistory();
  showToast('History cleared', 'info');
}

// Toast Notifications System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : type === 'error'
    ? '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    : '<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  toast.innerHTML = `
    ${iconSvg}
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

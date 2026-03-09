// ── State ─────────────────────────────────────────────────────────────────────
let selectedVoice = null;       // { id, name, accent, gender, lang, flag, avatar }
let micStream = null;           // MediaStream — kept alive for whole conversation
let mediaRecorder = null;       // per-utterance recorder
let audioChunks = [];
let conversationActive = false; // true while conversation is ongoing
let isUserSpeaking = false;     // VAD: user is currently speaking
let isProcessing = false;       // waiting for API / AI is speaking
let silenceTimer = null;
let speechStartTime = 0;

// VAD tuning
const SILENCE_THRESHOLD = 0.015;   // RMS level considered silence
const SILENCE_DURATION  = 1600;    // ms of silence → end of utterance
const MIN_SPEECH_MS     = 400;     // ignore clips shorter than this

// ── DOM refs ──────────────────────────────────────────────────────────────────
const screenSelect = document.getElementById("screen-select");
const screenChat   = document.getElementById("screen-chat");
const voiceGrid    = document.getElementById("voice-grid");
const playGreetingBtn = document.getElementById("play-greeting-btn");

const backBtn        = document.getElementById("back-btn");
const agentName      = document.getElementById("agent-name");
const agentLabel     = document.getElementById("agent-label");
const langBadge      = document.getElementById("lang-badge");
const chatContainer  = document.getElementById("chat-container");
const speakingIndicator = document.getElementById("speaking-indicator");
const micBtn         = document.getElementById("mic-btn");
const micIcon        = document.getElementById("mic-icon");
const stopIcon       = document.getElementById("stop-icon");
const statusText     = document.getElementById("status-text");
const micModal       = document.getElementById("mic-modal");
const modalRetryBtn  = document.getElementById("modal-retry-btn");
const modalCloseBtn  = document.getElementById("modal-close-btn");

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  await loadVoices();
  await playGreeting();
}

async function loadVoices() {
  try {
    const res = await fetch("/voices");
    const { voices } = await res.json();
    renderVoiceGrid(voices);
  } catch (e) {
    console.error("Failed to load voices", e);
  }
}

function renderVoiceGrid(voices) {
  voiceGrid.innerHTML = "";
  voices.forEach(v => {
    const card = document.createElement("div");
    card.className = "voice-card";
    card.innerHTML = `
      <div class="voice-card-avatar">${v.avatar} ${v.flag}</div>
      <div class="voice-card-name">${v.name}</div>
      <div class="voice-card-accent">${v.accent}</div>
      <div class="voice-card-badges">
        <span class="badge badge-lang">${v.lang.toUpperCase()}</span>
        <span class="badge badge-gender">${v.gender}</span>
      </div>`;
    card.addEventListener("click", () => selectVoice(v));
    voiceGrid.appendChild(card);
  });
}

async function playGreeting() {
  try {
    const res = await fetch("/greeting");
    const { audio_url } = await res.json();
    const audio = new Audio(audio_url);
    await audio.play().catch(() => {
      // Autoplay blocked — show play button
      playGreetingBtn.classList.remove("hidden");
    });
  } catch (e) {
    console.error("Greeting failed", e);
  }
}

playGreetingBtn.addEventListener("click", async () => {
  playGreetingBtn.classList.add("hidden");
  await playGreeting();
});

// ── Voice selection ───────────────────────────────────────────────────────────
function selectVoice(voice) {
  selectedVoice = voice;

  // Update chat header
  agentName.textContent  = `${voice.avatar} ${voice.name}`;
  agentLabel.textContent = `${voice.gender} · ${voice.accent}`;
  langBadge.textContent  = voice.lang.toUpperCase();

  // Reset chat
  chatContainer.innerHTML = `<div class="welcome-msg"><p>Tap the mic to start the conversation</p></div>`;
  micBtn.className = "mic-btn";
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  setStatus("Tap mic to start conversation");

  showScreen(screenChat);
}

backBtn.addEventListener("click", () => {
  endConversation();
  showScreen(screenSelect);
});

function showScreen(screen) {
  screenSelect.classList.remove("active");
  screenChat.classList.remove("active");
  screen.classList.add("active");
}

// ── Mic button ────────────────────────────────────────────────────────────────
micBtn.addEventListener("click", () => {
  if (!conversationActive) {
    startConversation();
  } else {
    endConversation();
  }
});

// ── Conversation flow ─────────────────────────────────────────────────────────
async function startConversation() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showMicModal();
    return;
  }

  conversationActive = true;
  isProcessing = false;
  isUserSpeaking = false;

  micBtn.classList.add("active");
  micIcon.classList.add("hidden");
  stopIcon.classList.remove("hidden");
  setStatus("Listening…");

  setupVAD(micStream);
}

function endConversation() {
  conversationActive = false;
  isUserSpeaking = false;
  isProcessing = false;

  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.onstop = null;  // don't process final chunk
    mediaRecorder.stop();
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }

  micBtn.className = "mic-btn";
  micIcon.classList.remove("hidden");
  stopIcon.classList.add("hidden");
  setSpeakingUI(false);
  setStatus("Tap mic to start conversation");
}

// ── Voice Activity Detection ──────────────────────────────────────────────────
function setupVAD(stream) {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.fftSize);

  function monitor() {
    if (!conversationActive) { audioContext.close(); return; }

    analyser.getByteTimeDomainData(dataArray);
    let rms = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      rms += v * v;
    }
    rms = Math.sqrt(rms / dataArray.length);

    if (rms > SILENCE_THRESHOLD) {
      // Sound detected
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
      if (!isUserSpeaking && !isProcessing) {
        startChunk();
      }
    } else {
      // Silence
      if (isUserSpeaking && !silenceTimer) {
        silenceTimer = setTimeout(() => {
          silenceTimer = null;
          stopChunk();
        }, SILENCE_DURATION);
      }
    }

    requestAnimationFrame(monitor);
  }

  requestAnimationFrame(monitor);
}

function startChunk() {
  if (!conversationActive || isProcessing) return;
  isUserSpeaking = true;
  speechStartTime = Date.now();
  audioChunks = [];

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus" : "";
  mediaRecorder = new MediaRecorder(micStream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.onstop = () => {
    const duration = Date.now() - speechStartTime;
    isUserSpeaking = false;
    if (duration >= MIN_SPEECH_MS && audioChunks.length > 0 && conversationActive) {
      isProcessing = true;
      micBtn.classList.remove("active", "speaking-user");
      micBtn.classList.add("processing");
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      processAudio(blob);
    }
  };

  mediaRecorder.start();
  micBtn.classList.remove("active");
  micBtn.classList.add("speaking-user");
  setStatus("Listening… 🎙️");
}

function stopChunk() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
async function processAudio(blob) {
  try {
    // 1. Transcribe
    setStatus("Transcribing…");
    const formData = new FormData();
    const ext = blob.type.includes("ogg") ? "ogg" : "webm";
    formData.append("audio", blob, `recording.${ext}`);
    formData.append("voice_lang", selectedVoice.lang);

    const transcribeRes = await fetch("/transcribe", { method: "POST", body: formData });
    if (!transcribeRes.ok) throw new Error(await transcribeRes.text());
    const { text } = await transcribeRes.json();

    if (!text.trim()) {
      resumeListening();
      return;
    }

    addBubble("user", text);

    // 2. Generate response — use selected voice's language
    setStatus("Thinking…");
    const genRes = await fetch("/generate-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: selectedVoice.lang, agent_name: selectedVoice.name }),
    });
    if (!genRes.ok) throw new Error(await genRes.text());
    const { response } = await genRes.json();

    // Add AI bubble now (empty — text will animate in as audio plays)
    const aiBubble = addBubble("ai");

    // 3. Speak
    setStatus("Speaking…");
    setSpeakingUI(true);
    micBtn.classList.remove("processing");
    micBtn.classList.add("active");

    const speakRes = await fetch("/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response, voice_id: selectedVoice.id }),
    });
    if (!speakRes.ok) throw new Error(await speakRes.text());
    const { audio_url } = await speakRes.json();

    const audio = new Audio(audio_url);

    // Animate text in sync with audio duration
    let animated = false;
    const startAnimation = () => {
      if (animated) return;
      animated = true;
      const durationMs = audio.duration && !isNaN(audio.duration)
        ? audio.duration * 1000
        : response.split(" ").length * 380; // fallback: ~380ms/word
      animateBubbleText(aiBubble, response, durationMs);
    };

    audio.onloadedmetadata = startAnimation;
    audio.onplay = startAnimation; // fallback if metadata fires late

    audio.onended = () => {
      // Ensure full text is visible if animation lagged
      aiBubble.textContent = response;
      setSpeakingUI(false);
      resumeListening();
    };
    audio.onerror = () => {
      aiBubble.textContent = response;
      setSpeakingUI(false);
      resumeListening();
    };
    await audio.play();

  } catch (err) {
    console.error(err);
    setSpeakingUI(false);
    setStatus(`Error: ${err.message}`);
    resumeListening();
  }
}

function resumeListening() {
  if (!conversationActive) return;
  isProcessing = false;
  isUserSpeaking = false;
  micBtn.className = "mic-btn active";
  micIcon.classList.add("hidden");
  stopIcon.classList.remove("hidden");
  setStatus("Listening…");
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setStatus(msg) { statusText.textContent = msg; }

function setSpeakingUI(on) { speakingIndicator.classList.toggle("hidden", !on); }

/** Add a chat bubble and return the inner bubble element for later animation. */
function addBubble(role, text = "") {
  const welcome = chatContainer.querySelector(".welcome-msg");
  if (welcome) welcome.remove();

  const row = document.createElement("div");
  row.className = `bubble-row ${role}`;

  const wrapper = document.createElement("div");
  wrapper.className = "bubble-wrapper";

  const label = document.createElement("div");
  label.className = "bubble-label";
  label.textContent = role === "user" ? "You" : (selectedVoice?.name ?? "Assistant");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  row.appendChild(wrapper);
  chatContainer.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return bubble; // caller can animate this element
}

/** Animate text word-by-word over durationMs milliseconds. */
function animateBubbleText(bubbleEl, text, durationMs) {
  const words = text.split(" ");
  const msPerWord = Math.max(40, durationMs / words.length);
  bubbleEl.textContent = "";
  let i = 0;
  const tick = () => {
    bubbleEl.textContent = words.slice(0, i + 1).join(" ");
    chatContainer.scrollTop = chatContainer.scrollHeight;
    i++;
    if (i < words.length) setTimeout(tick, msPerWord);
  };
  tick();
}

// ── Permission modal ──────────────────────────────────────────────────────────
function showMicModal() { micModal.classList.remove("hidden"); }
function hideMicModal()  { micModal.classList.add("hidden"); }

modalCloseBtn.addEventListener("click", hideMicModal);
modalRetryBtn.addEventListener("click", () => { hideMicModal(); startConversation(); });

// ── Start ─────────────────────────────────────────────────────────────────────
init();

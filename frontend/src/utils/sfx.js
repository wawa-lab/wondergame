/**
 * sfx.js — Web Audio API 程序化古风音效
 * 无需额外音频文件，全部用振荡器合成
 */

let _ctx = null;
let _muted = false;

// ── BGM 闪避（Ducking）──────────────────────────────────
let _bgmAudio = null;          // <audio> 元素引用，由 App 注册
let _bgmNormalVol = 0.35;      // 正常音量
let _bgmDuckVol   = 0.07;      // 闪避音量
let _restoreTimer = null;      // 恢复定时器

export function registerBgm(audioEl, normalVol = 0.35) {
  _bgmAudio = audioEl;
  _bgmNormalVol = normalVol;
}

// 平滑调整 audio.volume（原生 audio 无内置渐变，用 rAF 模拟）
function rampVolume(audio, target, durationMs) {
  const start = audio.volume;
  const diff = target - start;
  if (Math.abs(diff) < 0.001) return;
  const startTime = performance.now();
  const step = () => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    audio.volume = start + diff * t;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 音效开始时降低 BGM
function duckBgm(sfxDurationMs) {
  if (!_bgmAudio || _bgmAudio.muted || _bgmAudio.paused) return;
  // 取消旧的恢复定时器，重新计时（延长 duck 窗口）
  clearTimeout(_restoreTimer);
  rampVolume(_bgmAudio, _bgmDuckVol, 80);
  // 用单一定时器：最后一个音效结束后恢复，不依赖计数器
  _restoreTimer = setTimeout(() => {
    rampVolume(_bgmAudio, _bgmNormalVol, 400);
  }, sfxDurationMs + 120);
}

function ctx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  // iOS/Safari 需要用户手势后 resume
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function setSfxMuted(v) { _muted = v; }
export function isSfxMuted() { return _muted; }

// ── 基础合成辅助 ──────────────────────────────────────────
function playTone({ freq = 440, type = 'sine', gain = 0.18, attack = 0.01, decay = 0.12, sustain = 0, release = 0.25, duration = 0.4, detune = 0 } = {}) {
  const c = ctx();
  if (!c || _muted) return;
  const now = c.currentTime;
  const totalMs = (duration + release) * 1000;
  duckBgm(totalMs);

  const osc = c.createOscillator();
  const env = c.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + attack);
  env.gain.linearRampToValueAtTime(gain * sustain || gain * 0.4, now + attack + decay);
  env.gain.linearRampToValueAtTime(0, now + duration + release);

  osc.connect(env);
  env.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + release + 0.05);
}

// 拨弦模拟（Karplus-Strong 简化版）
function playPluck(freq = 440, gain = 0.22, duration = 0.8) {
  const c = ctx();
  if (!c || _muted) return;
  duckBgm(duration * 1000);
  const now = c.currentTime;

  // 噪声激励
  const bufLen = Math.floor(c.sampleRate / freq);
  const buf = c.createBuffer(1, bufLen, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  // 低通滤波器模拟弦的衰减
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = freq * 8;

  const env = c.createGain();
  env.gain.setValueAtTime(gain, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);

  src.connect(lp);
  lp.connect(env);
  env.connect(c.destination);
  src.start(now);
  src.stop(now + duration);
}

// ── 具名音效 ──────────────────────────────────────────────

// 按钮点击：轻柔拨弦
export function sfxClick() {
  playPluck(880, 0.07, 0.35);
}

// 翻页/下一句对话：两声短促古琴
export function sfxPage() {
  playPluck(660, 0.08, 0.4);
  setTimeout(() => playPluck(880, 0.06, 0.3), 80);
}

// 属性提升：上行三音
export function sfxSkillUp(count = 1) {
  const freqs = [523, 659, 784, 1047];
  const n = Math.min(count, 3);
  for (let i = 0; i <= n; i++) {
    setTimeout(() => playPluck(freqs[i] || 1047, 0.10 - i * 0.01, 0.5), i * 90);
  }
}

// 属性下降：下行两音，暗哑
export function sfxSkillDown() {
  playTone({ freq: 330, type: 'triangle', gain: 0.06, decay: 0.2, duration: 0.3 });
  setTimeout(() => playTone({ freq: 247, type: 'triangle', gain: 0.05, decay: 0.25, duration: 0.4 }), 120);
}

// 换装：华丽琶音
export function sfxOutfitChange() {
  const freqs = [523, 659, 784, 1047, 1319];
  freqs.forEach((f, i) => {
    setTimeout(() => playPluck(f, 0.09, 0.6), i * 55);
  });
}

// 金币获得：清脆叮声
export function sfxCoinGain() {
  playTone({ freq: 1568, type: 'sine', gain: 0.08, attack: 0.005, decay: 0.08, duration: 0.15, release: 0.3 });
  setTimeout(() => playTone({ freq: 2093, type: 'sine', gain: 0.06, attack: 0.005, decay: 0.06, duration: 0.12, release: 0.25 }), 60);
}

// NPC对话气泡出现：温柔一声
export function sfxBubbleOpen() {
  playTone({ freq: 784, type: 'sine', gain: 0.05, attack: 0.02, decay: 0.15, duration: 0.2, release: 0.3 });
}

// 好感上升：心跳感双音
export function sfxAffinityUp() {
  playTone({ freq: 523, type: 'sine', gain: 0.08, attack: 0.01, decay: 0.1, duration: 0.15, release: 0.2 });
  setTimeout(() => playTone({ freq: 659, type: 'sine', gain: 0.06, attack: 0.01, decay: 0.12, duration: 0.18, release: 0.25 }), 100);
}

// 好感下降：低沉单音
export function sfxAffinityDown() {
  playTone({ freq: 196, type: 'triangle', gain: 0.06, attack: 0.02, decay: 0.3, duration: 0.4, release: 0.3 });
}

// 场景进入：低沉钟鸣
export function sfxSceneEnter() {
  playTone({ freq: 220, type: 'sine', gain: 0.07, attack: 0.05, decay: 0.5, sustain: 0.3, duration: 1.2, release: 0.8 });
  setTimeout(() => playTone({ freq: 330, type: 'sine', gain: 0.04, attack: 0.08, decay: 0.4, duration: 1.0, release: 0.6 }), 200);
}

// Toast通知：轻柔提示音
export function sfxNotify(type = 'success') {
  if (type === 'success') {
    playTone({ freq: 880, type: 'sine', gain: 0.06, attack: 0.01, decay: 0.1, duration: 0.15, release: 0.2 });
    setTimeout(() => playTone({ freq: 1047, type: 'sine', gain: 0.05, attack: 0.01, decay: 0.1, duration: 0.15, release: 0.2 }), 80);
  } else if (type === 'error') {
    playTone({ freq: 294, type: 'sawtooth', gain: 0.05, attack: 0.02, decay: 0.2, duration: 0.3, release: 0.2 });
  } else {
    playTone({ freq: 660, type: 'sine', gain: 0.05, attack: 0.01, decay: 0.12, duration: 0.18, release: 0.2 });
  }
}

// 月份推进：庄重钟声
export function sfxMonthAdvance() {
  const freqs = [165, 220, 330];
  freqs.forEach((f, i) => {
    setTimeout(() => playTone({ freq: f, type: 'sine', gain: 0.07 - i * 0.01, attack: 0.04, decay: 0.6, duration: 1.5, release: 1.0 }), i * 300);
  });
}

// Web Audio: looping theme + procedural comic SFX. Starts only after the user presses ENTER.
let ctx, master, musicGain, musicFilter, sfxGain
let noiseBuf
let started = false
let muted = false
let scrollSrc, scrollGain, scrollFilter
let rainGain
let beatTimer = null

const FREE = '/audio/theme.mp3'            // CC BY 3.0, safe to publish
const LOCAL = '/audio/local-theme.mp3'     // private file, only present on the author's machine
const el = new Audio()
el.loop = true
el.preload = 'auto'

// which track is available? (a dev server answers missing files with index.html, so check the type)
export const track = (async () => {
  try {
    const r = await fetch(LOCAL, { method: 'HEAD' })
    if (r.ok && (r.headers.get('content-type') || '').startsWith('audio')) { el.src = LOCAL; return 'local' }
  } catch (e) { /* fall through */ }
  el.src = FREE
  return 'free'
})()

function makeNoise() {
  const len = ctx.sampleRate * 2
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return b
}

export async function start() {
  if (started) return
  started = true
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination)
  musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 900
  musicGain = ctx.createGain(); musicGain.gain.value = 0
  sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9
  ctx.createMediaElementSource(el).connect(musicFilter)
  musicFilter.connect(musicGain); musicGain.connect(master); sfxGain.connect(master)
  noiseBuf = makeNoise()

  // continuous wind that follows scroll speed
  scrollSrc = ctx.createBufferSource(); scrollSrc.buffer = noiseBuf; scrollSrc.loop = true
  scrollFilter = ctx.createBiquadFilter(); scrollFilter.type = 'bandpass'; scrollFilter.frequency.value = 600; scrollFilter.Q.value = 0.7
  scrollGain = ctx.createGain(); scrollGain.gain.value = 0
  scrollSrc.connect(scrollFilter); scrollFilter.connect(scrollGain); scrollGain.connect(sfxGain); scrollSrc.start()

  // rain bed (only audible in the freefall chapter)
  const rs = ctx.createBufferSource(); rs.buffer = noiseBuf; rs.loop = true
  const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 3500
  rainGain = ctx.createGain(); rainGain.gain.value = 0
  rs.connect(rf); rf.connect(rainGain); rainGain.connect(sfxGain); rs.start()

  await ctx.resume()
  await track
  try { await el.play() } catch (e) { /* autoplay blocked: user can toggle */ }
  musicGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2.5)
}

export function toggleMute() {
  muted = !muted
  if (!ctx) return muted
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.linearRampToValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.25)
  return muted
}

// scene mood: calm = muffled/quiet, action = open and loud
export function mood(kind) {
  if (!ctx) return
  const t = ctx.currentTime
  const m = { calm: [800, 0.45], drive: [9000, 0.85], rush: [16000, 1.0], dark: [2500, 0.7] }[kind] || [9000, 0.8]
  musicFilter.frequency.cancelScheduledValues(t)
  musicFilter.frequency.linearRampToValueAtTime(m[0], t + 0.8)
  musicGain.gain.cancelScheduledValues(t)
  musicGain.gain.linearRampToValueAtTime(m[1], t + 0.8)
}

export function rain(on) {
  if (!ctx) return
  rainGain.gain.linearRampToValueAtTime(on ? 0.12 : 0, ctx.currentTime + 0.6)
}

export function wind(speed) {
  if (!ctx) return
  const v = Math.min(Math.abs(speed) / 40, 1)
  scrollGain.gain.setTargetAtTime(v * 0.28, ctx.currentTime, 0.08)
  scrollFilter.frequency.setTargetAtTime(300 + v * 2200, ctx.currentTime, 0.08)
}

function env(g, t, a, peak, d) {
  g.gain.cancelScheduledValues(t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + a)
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d)
}

export function whoosh(dur = 0.7, from = 250, to = 4500) {
  if (!ctx) return
  const t = ctx.currentTime
  const s = ctx.createBufferSource(); s.buffer = noiseBuf
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = ctx.createGain(); env(g, t, dur * 0.45, 0.55, dur * 0.55)
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, Math.random()); s.stop(t + dur + 0.1)
}

export function stamp() {
  if (!ctx) return
  const t = ctx.currentTime
  const o = ctx.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.28)
  const g = ctx.createGain(); env(g, t, 0.005, 1, 0.34)
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.4)
  const s = ctx.createBufferSource(); s.buffer = noiseBuf
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500
  const g2 = ctx.createGain(); env(g2, t, 0.003, 0.45, 0.09)
  s.connect(f); f.connect(g2); g2.connect(sfxGain); s.start(t, Math.random()); s.stop(t + 0.15)
}

export function zap() {
  if (!ctx) return
  const t = ctx.currentTime
  const o = ctx.createOscillator(); o.type = 'sawtooth'
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.5)
  const lfo = ctx.createOscillator(); lfo.frequency.value = 70
  const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(o.frequency)
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 2
  const g = ctx.createGain(); env(g, t, 0.01, 0.5, 0.55)
  o.connect(f); f.connect(g); g.connect(sfxGain); o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7)
}

export function tick() {
  if (!ctx) return
  const t = ctx.currentTime
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1900
  const g = ctx.createGain(); env(g, t, 0.002, 0.12, 0.04)
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.08)
}

function thump(t, peak) {
  const o = ctx.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
  const g = ctx.createGain(); env(g, t, 0.006, peak, 0.16)
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 0.25)
}

export function heartbeat(on) {
  clearInterval(beatTimer)
  if (!ctx || !on) return
  const beat = () => { const t = ctx.currentTime; thump(t, 0.9); thump(t + 0.19, 0.6) }
  beat(); beatTimer = setInterval(beat, 700)
}

export const isMuted = () => muted

export const isStarted = () => started
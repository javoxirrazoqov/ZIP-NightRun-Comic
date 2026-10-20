import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import * as sound from './audio.js'

gsap.registerPlugin(ScrollTrigger)

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

// ---------- smooth scroll (driven by GSAP's ticker) ----------
const lenis = new Lenis({ lerp: 0.09 })
lenis.stop()
lenis.on('scroll', (e) => { ScrollTrigger.update(); sound.wind(e.velocity) })
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)

// ---------- comic "on twos" jitter at 12 fps ----------
if (!reduce) {
  setInterval(() => {
    const r = document.documentElement.style
    r.setProperty('--jx', (Math.random() * 3 - 1.5).toFixed(1) + 'px')
    r.setProperty('--jy', (Math.random() * 3 - 1.5).toFixed(1) + 'px')
  }, 83)
}

// ---------- halftone cursor ----------
const cursor = $('.cursor')
{
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.25, ease: 'power3' })
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.25, ease: 'power3' })
  addEventListener('pointermove', (e) => { cursor.classList.add('on'); cx(e.clientX); cy(e.clientY) })
  document.addEventListener('pointerover', (e) => cursor.classList.toggle('big', !!e.target.closest('button, a, [data-tilt]')))
}

// ---------- HUD ----------
gsap.to('#bar', { width: '100%', ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.2 } })

let currentScene = null
function enterScene(el) {
  if (currentScene === el) return
  currentScene = el
  $('#chapter').textContent = el.dataset.chapter || ''
  sound.mood(el.dataset.mood)
}

const soundBtn = $('#sound')
soundBtn.addEventListener('click', async () => {
  if (!sound.isStarted()) { await sound.start(); sound.mood(currentScene?.dataset.mood); soundBtn.textContent = 'SOUND ON'; return }
  const m = sound.toggleMute()
  soundBtn.textContent = m ? 'SOUND OFF' : 'SOUND ON'
})

// ---------- helpers ----------
const pinTl = (id, len = '+=240%') =>
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: id, start: 'top top', end: len, pin: true, scrub: 0.6,
      onToggle: (self) => self.isActive && enterScene($(id)),
    },
  })

// title card slams in, holds, then leaves
const chapterCard = (tl, scene, at = 0) => {
  const c = $('.chapter-card', $(scene))
  tl.fromTo(c, { xPercent: -140, rotate: -12, autoAlpha: 0 }, { xPercent: 0, rotate: -3, autoAlpha: 1, duration: 0.05, ease: 'back.out(2)' }, at)
    .call(sound.stamp, null, at + 0.04)
    .to(c, { xPercent: -140, autoAlpha: 0, duration: 0.05 }, at + 0.16)
}

// SFX word stamps in, then leaves
const stamp = (tl, sel, at, rot = -8, snd = sound.stamp) =>
  tl
    .fromTo(sel, { opacity: 0, scale: 2.4, rotate: rot - 14 }, { opacity: 1, scale: 1, rotate: rot, duration: 0.05, ease: 'back.out(3)' }, at)
    .call(snd, null, at + 0.03)
    .to(sel, { opacity: 0, duration: 0.06 }, at + 0.22)

const pop = (tl, sel, at) =>
  tl.fromTo(sel, { scale: 0, rotate: -8, autoAlpha: 0, transformOrigin: '10% 100%' }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.05, ease: 'back.out(2.4)' }, at)

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function buildScenes() {
  // 1 · cover
  {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#s1', start: 'top top', end: '+=110%', pin: true, scrub: 0.6, onToggle: (s) => s.isActive && enterScene($('#s1')) },
    })
    tl.to('.cover__word', { scale: 1.25, yPercent: -8 }, 0)
      .to('.cover__zip', { xPercent: 70, rotate: 8, scale: 0.92 }, 0)
      .to('.cover__cap', { x: -40, opacity: 0 }, 0.5)
      .to('.cover__hint', { opacity: 0 }, 0)
      .call(sound.whoosh, [0.9], 0.05)
  }

  // 2 · origin: comic page panels slam in one by one
  {
    const tl = pinTl('#s2', '+=300%')
    chapterCard(tl, '#s2', 0)
    const slam = (sel, at, x, y) =>
      tl.fromTo(sel, { scale: 1.7, xPercent: x, yPercent: y, autoAlpha: 0 }, { scale: 1, xPercent: 0, yPercent: 0, autoAlpha: 1, duration: 0.07, ease: 'power4.out' }, at)
        .call(sound.stamp, null, at + 0.05)
    slam('.p1', 0.1, -20, 0)
    slam('.p2', 0.26, 20, -10)
    pop(tl, '.bubble--l', 0.34)
    slam('.p3', 0.44, 0, 20)
    tl.fromTo('.mini-sfx', { scale: 3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.04, ease: 'back.out(3)' }, 0.5)
    pop(tl, '.bubble--r', 0.54)
    slam('.p4', 0.62, 20, 10)
    slam('.p5', 0.78, 0, 30)
    tl.fromTo('.p5 .big', { scale: 0.7 }, { scale: 1, duration: 0.18 }, 0.78)
      .to('.p1 img', { yPercent: -3, duration: 0.5 }, 0.1)
      .to({}, { duration: 0.12 })
  }

  // 3 · rooftops
  {
    const tl = pinTl('#s3')
    chapterCard(tl, '#s3', 0)
    const o = { v: 0 }
    tl.fromTo('.leap', { x: '-30vw', y: '40vh', rotate: -18, scale: 0.8 }, { x: '78vw', y: '-14vh', rotate: 14, scale: 1.1 }, 0.1)
      .fromTo('#s3 .stage__bg', { scale: 1.02, xPercent: 2 }, { scale: 1.16, xPercent: -4 }, 0)
      .fromTo('#s3 .speed', { opacity: 0, xPercent: 10 }, { opacity: 0.7, xPercent: -12 }, 0.2)
      .to(o, { v: 148, onUpdate: () => ($('#speed').textContent = Math.round(o.v)), duration: 0.6 }, 0.2)
      .call(sound.whoosh, [0.9], 0.3)
    pop(tl, '.b-roof', 0.38)
    tl.to('.b-roof', { autoAlpha: 0, duration: 0.05 }, 0.58)
      .fromTo('#s3 .caption', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.12 }, 0.2)
    stamp(tl, '.sfx--a', 0.6, -8, () => sound.whoosh(0.5, 400, 6000))
  }

  // 4 · alley
  {
    const tl = pinTl('#s4')
    chapterCard(tl, '#s4', 0)
    const o = { t: 720 }
    let last = 720
    tl.fromTo('.run', { xPercent: -50, left: '50%', scale: 0.18, y: '18vh' }, { scale: 1.12, y: 0 }, 0.1)
      .fromTo('#s4 .stage__bg', { scale: 1 }, { scale: 1.35 }, 0)
      .fromTo('#s4 .speed', { opacity: 0, scale: 0.8 }, { opacity: 0.8, scale: 1.4 }, 0.2)
      .to(o, {
        t: 41,
        onUpdate: () => {
          $('#timer').textContent = fmt(o.t)
          if (Math.floor(o.t / 20) !== Math.floor(last / 20)) sound.tick()
          last = o.t
        },
        duration: 0.8,
      }, 0.1)
      .to('.run', { x: '-6vw', yoyo: true, repeat: 6, duration: 0.06 }, 0.3)
    pop(tl, '.b-alley', 0.3)
    tl.to('.b-alley', { autoAlpha: 0, duration: 0.05 }, 0.5)
      .fromTo('#s4 .caption', { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.12 }, 0.2)
    stamp(tl, '.sfx--b', 0.62, -6)
    ScrollTrigger.create({ trigger: '#s4', start: 'top 60%', end: '+=240%', onToggle: (s) => sound.heartbeat(s.isActive) })
  }

  // 5 · gear
  {
    const tl = pinTl('#s5', '+=260%')
    chapterCard(tl, '#s5', 0)
    tl.fromTo('.gear__fig', { scale: 0.7, autoAlpha: 0, yPercent: 8 }, { scale: 1, autoAlpha: 1, yPercent: 0, duration: 0.14, ease: 'power3.out' }, 0.1)
      .call(sound.whoosh, [0.6], 0.1)
      .fromTo('.gear__title', { xPercent: 8 }, { xPercent: -10, duration: 1 }, 0)
    $$('#s5 .co').forEach((c, i) => {
      const at = 0.3 + i * 0.14
      tl.fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, at)
        .fromTo($('div', c), { scaleX: 0, transformOrigin: c.classList.contains('co--r') ? '0 50%' : '100% 50%' }, { scaleX: 1, duration: 0.07, ease: 'power3.out' }, at)
        .call(sound.tick, null, at)
    })
    tl.to({}, { duration: 0.1 })
  }

  // 6 · freefall
  {
    const tl = pinTl('#s6')
    chapterCard(tl, '#s6', 0)
    const o = { a: 412 }
    tl.fromTo('.fall', { xPercent: -50, left: '50%', y: '-60vh', rotate: -25 }, { y: '24vh', rotate: 20 }, 0.1)
      .fromTo('.fall-bg', { yPercent: 8 }, { yPercent: -18, scale: 1.25 }, 0)
      .to(o, { a: 3, onUpdate: () => ($('#alt').textContent = Math.round(o.a)), duration: 0.8 }, 0.1)
      .call(sound.whoosh, [1, 200, 5000], 0.15)
    pop(tl, '.b-fall', 0.4)
    tl.to('.b-fall', { autoAlpha: 0, duration: 0.05 }, 0.6)
      .fromTo('#s6 .caption', { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.12 }, 0.3)
    stamp(tl, '.sfx--c', 0.35, -4, () => sound.whoosh(0.8, 800, 200))
    ScrollTrigger.create({ trigger: '#s6', start: 'top 60%', end: '+=240%', onToggle: (s) => sound.rain(s.isActive) })
  }

  // 7 · cast
  {
    const tl = pinTl('#s7', '+=220%')
    chapterCard(tl, '#s7', 0)
    tl.fromTo('.card--zip', { xPercent: -120, rotate: -14, autoAlpha: 0 }, { xPercent: 0, rotate: -1.5, autoAlpha: 1, duration: 0.14, ease: 'power3.out' }, 0.1)
      .call(sound.stamp, null, 0.22)
      .fromTo('.card--static', { xPercent: 120, rotate: 14, autoAlpha: 0 }, { xPercent: 0, rotate: 1.5, autoAlpha: 1, duration: 0.14, ease: 'power3.out' }, 0.3)
      .call(sound.stamp, null, 0.42)
    $$('.stats i').forEach((bar) => {
      const b = document.createElement('b'); bar.appendChild(b)
      tl.fromTo(b, { width: '0%' }, { width: bar.dataset.v + '%', duration: 0.12, ease: 'power2.out' }, 0.45 + Math.random() * 0.1)
    })
    tl.to({}, { duration: 0.2 })
  }

  // 8 · face-off
  {
    const tl = pinTl('#s8', '+=230%')
    tl.fromTo('.duel__half--zip', { xPercent: -100 }, { xPercent: 0, duration: 0.2, ease: 'power3.out' }, 0)
      .fromTo('.duel__half--static', { xPercent: 100 }, { xPercent: 0, duration: 0.2, ease: 'power3.out' }, 0)
      .call(sound.stamp, null, 0.2)
      .fromTo('.zipimg', { scale: 0.9 }, { scale: 1.04 }, 0.2)
      .fromTo('.staticimg', { scale: 0.9, y: 40 }, { scale: 1.02, y: 0 }, 0.2)
      .fromTo('.tag', { autoAlpha: 0, y: -30 }, { autoAlpha: 1, y: 0, duration: 0.08, stagger: 0.07 }, 0.24)
    chapterCard(tl, '#s8', 0.05)
    pop(tl, '.b-duel1', 0.38)
    pop(tl, '.b-duel2', 0.52)
    tl.fromTo('.duel__flash', { opacity: 0 }, { opacity: 1, duration: 0.025 }, 0.7)
      .to('.duel__flash', { opacity: 0, duration: 0.1 }, 0.73)
    stamp(tl, '.sfx--d', 0.7, -4, sound.zap)
    tl.to({}, { duration: 0.1 })
  }

  // 9 · next issue
  {
    gsap.timeline({ scrollTrigger: { trigger: '#s9', start: 'top 70%', toggleActions: 'play none none reverse', onToggle: (s) => s.isActive && enterScene($('#s9')) } })
      .from('.next h3', { yPercent: 40, autoAlpha: 0, duration: 0.5, ease: 'power4.out' })
      .from('.teaser', { y: 90, rotate: 8, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(1.6)' }, '-=0.2')
  }

  // 10 · end
  {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#s10', start: 'top 70%', toggleActions: 'play none none reverse', onToggle: (s) => s.isActive && enterScene($('#s10')) } })
    tl.from('.end__title span', { yPercent: 110, duration: 0.7, ease: 'power4.out', stagger: 0.12 })
      .from('.end__sub, #replay, .end__made, .end__credit', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 }, '-=0.2')
  }
}

// ---------- 3D tilt on cast cards ----------
$$('[data-tilt]').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    gsap.to(card, { rotateY: px * 14, rotateX: -py * 14, duration: 0.3, overwrite: 'auto' })
  })
  card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5 }))
})

$('#replay').addEventListener('click', () => lenis.scrollTo(0, { duration: 3 }))

// ---------- gate ----------
async function enter(withSound) {
  if (withSound) await sound.start()
  else soundBtn.textContent = 'SOUND OFF'
  document.body.classList.remove('locked')
  gsap.to('#gate', { yPercent: -100, duration: 0.8, ease: 'power4.inOut', onComplete: () => $('#gate').remove() })
  lenis.start()
  ScrollTrigger.refresh()
  enterScene($('#s1'))
  sound.whoosh(1.2)
}
$('#enter').addEventListener('click', () => enter(true))
$('#silent').addEventListener('click', () => enter(false))

sound.track.then((t) => {
  $('.end__credit').innerHTML = t === 'local'
    ? 'Music: “What’s Up Danger” by Blackway &amp; Black Caviar · private preview, not for public release'
    : 'Music: “Go Hard” by Alex-Productions · CC BY 3.0 · <a href="https://onsound.eu/" target="_blank" rel="noopener">onsound.eu</a>'
})

buildScenes()
window.addEventListener('load', () => ScrollTrigger.refresh())
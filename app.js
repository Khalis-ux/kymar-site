/* Kymar landing — interactive bits.
 *
 * 1) Hero phone-frame parallax tilt (mousemove, desktop only).
 * 2) Interval-ID demo using the Web Audio API: a Play button
 *    triggers two pure sines, then the user identifies the
 *    interval from a 4-option grid. The whole flow is gesture-
 *    initiated so mobile browsers don't block the audio context.
 *
 * No build step, no framework — vanilla ES2020+. Loads with `defer`,
 * so the DOM is parsed before any of this runs. */

(() => {
  'use strict';

  /* ---------- 1. Phone-frame parallax tilt ---------- */

  const heroScreen = document.querySelector('.hero-screen');
  const heroFrame  = heroScreen?.querySelector('.phone-frame');

  if (heroScreen && heroFrame && matchMedia('(hover: hover)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Limit the tilt to ~8deg in each axis — past that the perspective
    // distortion starts to read as "broken layout" rather than parallax.
    const MAX = 8;
    heroScreen.addEventListener('mousemove', (e) => {
      const r = heroScreen.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;   // -1..1
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      heroFrame.style.transform =
        `rotateY(${x * MAX}deg) rotateX(${-y * MAX}deg)`;
    });
    heroScreen.addEventListener('mouseleave', () => {
      // CSS transition handles the easing back to neutral.
      heroFrame.style.transform = '';
    });
  }

  /* ---------- 2. Interactive interval-ID demo ---------- */

  const demo = document.querySelector('.demo');
  if (!demo) return;

  const playBtn   = demo.querySelector('.demo-play');
  const nextBtn   = demo.querySelector('.demo-next');
  const optBtns   = Array.from(demo.querySelectorAll('.demo-options button'));
  const fb        = demo.querySelector('.demo-feedback');
  const msgIdle   = fb.querySelector('.demo-msg-idle');
  const msgCorrect = fb.querySelector('.demo-msg-correct');
  const msgWrong  = fb.querySelector('.demo-msg-wrong');

  // Catalogue mirrors the four option buttons in the markup.
  // Keep semitone values in sync with `data-semitones` attributes.
  const POOL = [4, 5, 7, 12];
  let audioCtx = null;
  let currentSemis = null;   // null when no interval is in flight
  let answered = false;

  function ensureCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function playTone(ctx, midi, when, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    osc.connect(gain);
    gain.connect(ctx.destination);
    // 50 ms attack + decay envelope so the listener doesn't hear a
    // click at the boundary, and a comfortable 0.18 peak gain.
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.18, when + 0.05);
    gain.gain.setValueAtTime(0.18, when + duration - 0.08);
    gain.gain.linearRampToValueAtTime(0, when + duration);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  function playInterval(semitones) {
    const ctx = ensureCtx();
    // Random root in [60, 67] (C4..G4). The interval is ascending,
    // so the second note may sit up to one octave above — well
    // within the comfortable sine-tone range.
    const root = 60 + Math.floor(Math.random() * 8);
    const t = ctx.currentTime + 0.05;
    playTone(ctx, root, t, 0.55);
    playTone(ctx, root + semitones, t + 0.62, 0.55);
  }

  function setState(s) { fb.dataset.state = s; }

  function newRound() {
    currentSemis = POOL[Math.floor(Math.random() * POOL.length)];
    answered = false;
    setState('playing');
    optBtns.forEach(b => { b.disabled = false; b.dataset.judged = ''; });
    nextBtn.hidden = true;
    playInterval(currentSemis);
  }

  playBtn.addEventListener('click', () => {
    if (currentSemis === null || answered) {
      newRound();
    } else {
      // Replay the same interval — the audio context may have been
      // suspended in the meantime, so unlock it again.
      playInterval(currentSemis);
    }
  });

  optBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentSemis === null || answered) return;
      const picked = Number(btn.dataset.semitones);
      const correct = picked === currentSemis;
      answered = true;
      // Mark every button: correct one greens up; picked-wrong reds out.
      optBtns.forEach(b => {
        const s = Number(b.dataset.semitones);
        if (s === currentSemis) b.dataset.judged = 'correct';
        else if (b === btn)     b.dataset.judged = 'wrong';
        b.disabled = true;
      });
      // Inject the interval name into the active feedback string so
      // both the correct + wrong paths surface what the answer was.
      const correctName = optBtns
        .find(b => Number(b.dataset.semitones) === currentSemis)
        .textContent.trim();
      (correct ? msgCorrect : msgWrong)
        .querySelector('strong').textContent = correctName;
      setState(correct ? 'correct' : 'wrong');
      nextBtn.hidden = false;
    });
  });

  nextBtn.addEventListener('click', newRound);
})();

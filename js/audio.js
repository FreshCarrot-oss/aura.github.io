// ═══════════════════════════════════════════
//  AUDIO ENGINE  (audio.js)
//  Tries to load files first; falls back to
//  Web Audio API procedural generation.
//
//  AMBIENT KEYS:
//   rain         — петля дождя
//   fire         — петля камина
//   wind         — петля ветра
//   cafe         — петля кафе
//   typing       — фоновые клики клавиатуры
//   thunder      — петля атмосферного грома (далёкие раскаты)
//   thunderstrike— одиночный удар грома при вспышке молнии
// ═══════════════════════════════════════════
const PF_Audio = (() => {
  let AC = null, masterG = null, ambG = null;
  const ambChannels = {};
  const ambHtmlAudio = {};
  const ambProcNodes = {};
  const ambState = {
    rain: false, fire: false, wind: false,
    cafe: false, typing: false,
    thunder: false,       // фоновый гул грозы (петля)
  };

  let typingOn     = false;
  let typingAudio  = null;
  let strikeAudio  = null; // HTMLAudioElement для thunderstrike файла

  // ── Init Web Audio ──
  function initAC() {
    if (AC) { AC.resume(); return; }
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain(); masterG.gain.value = .6; masterG.connect(AC.destination);
    ambG    = AC.createGain(); ambG.gain.value    = 1;  ambG.connect(masterG);
    // Петлевые каналы (thunder отдельный канал)
    for (const k of ['rain','fire','wind','cafe','thunder']) {
      const g = AC.createGain(); g.gain.value = 0; g.connect(ambG);
      ambChannels[k] = g;
    }
  }

  // ── Web Audio helpers ──
  function noise(dur=2) {
    const sr=AC.sampleRate, buf=AC.createBuffer(1,sr*dur,sr), d=buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=AC.createBufferSource(); src.buffer=buf; src.loop=true; return src;
  }
  function bq(t,f,q=1) { const n=AC.createBiquadFilter(); n.type=t; n.frequency.value=f; n.Q.value=q; return n; }

  // ── Try to load HTML Audio from file ──
  function tryLoadAudio(name, loop=true) {
    return new Promise(resolve => {
      const exts=['.mp3','.wav','.ogg']; let idx=0;
      const tryNext = () => {
        if (idx>=exts.length) { resolve(null); return; }
        const a = new Audio(`audio/ambient/${name}${exts[idx++]}`);
        a.loop=loop; a.preload='auto';
        a.oncanplaythrough = () => resolve(a);
        a.onerror = tryNext;
        a.load();
      };
      tryNext();
    });
  }

  // ── Procedural ambient builders ──
  function buildProcRain(ch) {
    const n=noise(), bp=bq('bandpass',800,.7), lp=bq('lowpass',2600);
    n.connect(bp); bp.connect(lp); lp.connect(ch);
    const n2=noise(), lp2=bq('lowpass',220); n2.connect(lp2); lp2.connect(ch);
    n.start(); n2.start(); return [n,n2];
  }
  function buildProcFire(ch) {
    const nodes=[];
    for (let i=0;i<3;i++) {
      const n=noise(), bp=bq('bandpass',300+i*200,.4), g=AC.createGain();
      const lfo=AC.createOscillator(), lg=AC.createGain();
      lfo.frequency.value=.8+i*.5; lg.gain.value=.1;
      lfo.connect(lg); lg.connect(g.gain); g.gain.value=.18; lfo.start();
      n.connect(bp); bp.connect(g); g.connect(ch); n.start();
      nodes.push(n,lfo);
    }
    return nodes;
  }
  function buildProcWind(ch) {
    const n=noise(), lp=bq('lowpass',400);
    const lfo=AC.createOscillator(), lg=AC.createGain();
    lfo.frequency.value=.07; lg.gain.value=200;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    n.connect(lp); lp.connect(ch); n.start(); return [n,lfo];
  }
  function buildProcCafe(ch) {
    const nodes=[];
    for (let i=0;i<4;i++) {
      const n=noise(1), bp=bq('bandpass',600+i*200,.3), g=AC.createGain();
      g.gain.value=.07+i*.02;
      n.connect(bp); bp.connect(g); g.connect(ch); n.start(); nodes.push(n);
    }
    return nodes;
  }
  // Атмосферный гул грозы (далёкие раскаты в петле)
  function buildProcThunder(ch) {
    const nodes=[];
    // Низкочастотный гул с медленной модуляцией
    const n=noise(4), lp=bq('lowpass',180), lp2=bq('lowpass',90);
    const lfo=AC.createOscillator(), lg=AC.createGain();
    lfo.type='sine'; lfo.frequency.value=0.04; lg.gain.value=60;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    n.connect(lp); lp.connect(lp2); lp2.connect(ch); n.start();
    // Второй слой — чуть выше, медленнее
    const n2=noise(3), lp3=bq('lowpass',120), g2=AC.createGain();
    const lfo2=AC.createOscillator(), lg2=AC.createGain();
    g2.gain.value=.6; lfo2.type='sine'; lfo2.frequency.value=0.027; lg2.gain.value=40;
    lfo2.connect(lg2); lg2.connect(lp3.frequency); lfo2.start();
    n2.connect(lp3); lp3.connect(g2); g2.connect(ch); n2.start();
    nodes.push(n,lfo,n2,lfo2);
    return nodes;
  }

  const procBuilders = {
    rain: buildProcRain, fire: buildProcFire,
    wind: buildProcWind, cafe: buildProcCafe,
    thunder: buildProcThunder,
  };

  // ── Toggle ambient ──
  async function toggle(key) {
    initAC();
    ambState[key] = !ambState[key];
    const on = ambState[key];

    if (key === 'typing') {
      typingOn = on;
      if (on && !typingAudio) {
        typingAudio = await tryLoadAudio('typing', true);
        if (typingAudio) typingAudio.volume = .4;
      }
      if (typingAudio) { on ? typingAudio.play().catch(()=>{}) : typingAudio.pause(); }
      return on;
    }

    const ch = ambChannels[key];
    if (on) {
      if (!ambHtmlAudio[key]) ambHtmlAudio[key] = await tryLoadAudio(key, true);
      if (ambHtmlAudio[key]) {
        ambHtmlAudio[key].volume = .55;
        ambHtmlAudio[key].play().catch(()=>{});
      } else {
        if (!ambProcNodes[key]) ambProcNodes[key] = procBuilders[key](ch);
        ch.gain.setTargetAtTime(.48, AC.currentTime, .7);
      }
    } else {
      if (ambHtmlAudio[key]) ambHtmlAudio[key].pause();
      if (ambProcNodes[key]) ch.gain.setTargetAtTime(0, AC.currentTime, .5);
    }
    return on;
  }

  // ── Volume ──
  function setMasterVol(v) { if (masterG) masterG.gain.value = v; }
  function setAmbVol(v) {
    if (ambG) ambG.gain.value = v;
    for (const [k, a] of Object.entries(ambHtmlAudio)) {
      if (a && ambState[k]) a.volume = v * .8;
    }
    if (typingAudio && typingOn) typingAudio.volume = v * .55;
  }

  // ── Удар грома при молнии ──
  // Сначала пробует thunderstrike.mp3, затем thunder.mp3 (как запасной),
  // затем процедурный.
  function playThunder() {
    if (!AC) return;

    // Попытка файла thunderstrike
    if (!strikeAudio) {
      const a = new Audio('audio/ambient/thunderstrike.mp3');
      a.onerror = () => {
        // fallback: попробуем thunderstrike.wav
        const b = new Audio('audio/ambient/thunderstrike.wav');
        b.onerror = () => { strikeAudio = 'proc'; };
        b.oncanplaythrough = () => { strikeAudio = b; };
        b.load();
      };
      a.oncanplaythrough = () => { strikeAudio = a; };
      a.load();
    }

    if (strikeAudio && strikeAudio !== 'proc') {
      strikeAudio.currentTime = 0;
      strikeAudio.volume = .75;
      strikeAudio.play().catch(()=>{});
      return;
    }

    // Процедурный удар грома
    const t0 = AC.currentTime;
    // Основной бас-удар
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(75, t0);
    o.frequency.exponentialRampToValueAtTime(20, t0+.8);
    g.gain.setValueAtTime(0, t0);
    g.gain.setTargetAtTime(.7, t0, .008);
    g.gain.setTargetAtTime(0, t0+.3, .55);
    o.connect(g); g.connect(masterG); o.start(t0); o.stop(t0+3);
    // Шумовой компонент (треск)
    const nb = AC.createBuffer(1, Math.floor(AC.sampleRate*1.5), AC.sampleRate);
    const nd = nb.getChannelData(0); for (let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1;
    const ns = AC.createBufferSource(); ns.buffer=nb;
    const nlp = bq('lowpass',500), ng = AC.createGain();
    ng.gain.setValueAtTime(.4, t0); ng.gain.exponentialRampToValueAtTime(.001, t0+1.2);
    ns.connect(nlp); nlp.connect(ng); ng.connect(masterG);
    ns.start(t0); ns.stop(t0+1.5);
  }

  // ── Typing click ──
  function playClick() {
    if (!typingOn) return;
    if (typingAudio) return;
    if (!AC) return;
    const o=AC.createOscillator(), g=AC.createGain();
    o.type='square'; o.frequency.value=200+Math.random()*200;
    g.gain.setValueAtTime(.05,AC.currentTime); g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.04);
    o.connect(g); g.connect(masterG); o.start(); o.stop(AC.currentTime+.05);
  }
  document.addEventListener('keydown', playClick);

  // ── Session end chime ──
  function chime() {
    if (!AC) return;
    [[880,0],[1100,.35],[1320,.65],[880,.9]].forEach(([f,t]) => {
      const o=AC.createOscillator(), g=AC.createGain();
      o.type='sine'; o.frequency.value=f;
      const T=AC.currentTime+t;
      g.gain.setValueAtTime(0,T); g.gain.setTargetAtTime(.2,T,.02); g.gain.setTargetAtTime(0,T+.4,.12);
      o.connect(g); g.connect(masterG); o.start(T); o.stop(T+.8);
    });
  }

  return { initAC, toggle, setMasterVol, setAmbVol, playThunder, chime, ambState };
})();

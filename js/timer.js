// ═══════════════════════════════════════════
//  TIMER  (timer.js)
// ═══════════════════════════════════════════
const PF_Timer = (() => {
  let tSec=25*60, tMax=25*60, tOn=false, tIv=null;
  let tMode='work', pomCount=0, totalFocusSec=0;

  const QUOTES = [
    'маленький шаг сегодня — большой результат завтра',
    'фокус — это сверхсила',
    'начни. просто начни',
    'прогресс важнее совершенства',
    'один помидор за раз',
    'сделай сейчас, оцени потом',
    'глубокая работа = настоящий результат',
    'выключи уведомления. включи мозг',
    'дискомфорт сейчас — рост навсегда',
    'сделай это для будущего себя',
    'терпение + повторение = мастерство',
  ];
  function randQuote() { return QUOTES[Math.floor(Math.random()*QUOTES.length)]; }

  function fmtT(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

  function render() {
    const rat = tMax>0 ? tSec/tMax : 1;
    const acc = PF_Canvas.getSceneAcc(window.PF?.scene||'rain');
    const col = rat<.25 ? '#ff6655' : rat<.5 ? '#ffaa44' : acc;
    const D   = id => document.getElementById(id);
    D('timer-display').textContent  = fmtT(tSec);
    D('timer-display').style.color  = col;
    D('timer-display').style.textShadow = `0 0 30px ${col}`;
    D('timer-bar').style.width      = (rat*100)+'%';
    D('timer-bar').style.background = col;
    D('timer-bar').style.boxShadow  = `0 0 8px ${col}`;
    D('timer-mode-lbl').textContent = tMode==='work' ? 'ФОКУС' : 'ПЕРЕРЫВ';
    D('pom-count').textContent      = `🍅 ×${pomCount}`;
    D('focus-total').textContent    = `${Math.floor(totalFocusSec/60)}м фокуса`;
  }

  function tick() {
    tSec--;
    if (tMode==='work') totalFocusSec++;
    if (tSec <= 0) {
      clearInterval(tIv); tOn=false;
      document.getElementById('btn-start').textContent='▶ СТАРТ';
      PF_Audio.initAC(); PF_Audio.chime();
      if (tMode==='work') {
        pomCount++;
        tMode='break'; tMax=5*60; tSec=tMax;
        PF_UI.showNotif(`⏸ ПЕРЕРЫВ!\n5 МИНУТ ОТДЫХА\n\n${randQuote()}`);
      } else {
        tMode='work';
        const m=parseInt(document.querySelector('.tbtn.active[data-min]')?.dataset.min||25);
        tMax=m*60; tSec=tMax;
        PF_UI.showNotif('▶ ВПЕРЁД!\nПОРА РАБОТАТЬ!');
      }
    }
    render();
  }

  function startStop() {
    PF_Audio.initAC();
    if (tOn) {
      clearInterval(tIv); tOn=false;
      document.getElementById('btn-start').textContent='▶ СТАРТ';
    } else {
      tOn=true;
      document.getElementById('btn-start').textContent='⏸ ПАУЗА';
      tIv=setInterval(tick,1000);
    }
  }

  function reset() {
    clearInterval(tIv); tOn=false; tMode='work';
    const m=parseInt(document.querySelector('.tbtn.active[data-min]')?.dataset.min||25);
    tMax=m*60; tSec=tMax;
    document.getElementById('btn-start').textContent='▶ СТАРТ';
    render();
  }

  function setPreset(m) {
    if (m===0) {
      const v=prompt('Введи минуты:','30');
      if (!v||isNaN(+v)||+v<=0) return false;
      tMax=+v*60; tSec=tMax;
    } else { tMax=m*60; tSec=tMax; }
    tMode='work'; clearInterval(tIv); tOn=false;
    document.getElementById('btn-start').textContent='▶ СТАРТ';
    render(); return true;
  }

  function showStats() {
    const done=document.querySelectorAll('.task-cb.done').length;
    const all =document.querySelectorAll('.task-item').length;
    document.getElementById('s-pom').textContent   = pomCount;
    document.getElementById('s-min').textContent   = Math.floor(totalFocusSec/60);
    document.getElementById('s-tasks').textContent = `${done}/${all}`;
    document.getElementById('s-scene').textContent = (window.PF?.scene||'—').toUpperCase();
    document.getElementById('stats-modal').classList.remove('hidden');
  }

  function bindControls() {
    document.getElementById('btn-start').addEventListener('click', startStop);
    document.getElementById('btn-reset').addEventListener('click', reset);
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('close-stats').addEventListener('click', () => {
      document.getElementById('stats-modal').classList.add('hidden');
    });
    document.querySelectorAll('.tbtn[data-min]').forEach(b => {
      b.addEventListener('click', () => {
        const m = parseInt(b.dataset.min);
        if (!setPreset(m)) return;
        document.querySelectorAll('.tbtn[data-min]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
      });
    });
  }

  // Clock
  function updateClock() {
    const n=new Date();
    const DAYS=['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];
    const MONTHS=['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];
    document.getElementById('clock').textContent=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
    document.getElementById('date-str').textContent=`${DAYS[n.getDay()]} ${n.getDate()} ${MONTHS[n.getMonth()]} ${n.getFullYear()}`;
  }
  setInterval(updateClock,1000); updateClock();

  // Quotes
  function cycleQuote() {
    const el=document.getElementById('quote-line');
    el.style.opacity='0';
    setTimeout(()=>{ el.textContent=randQuote(); el.style.opacity='1'; },800);
  }
  cycleQuote(); setInterval(cycleQuote,22000);

  return { bindControls, render };
})();

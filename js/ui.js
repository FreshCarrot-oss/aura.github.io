// ═══════════════════════════════════════════
//  UI  (ui.js)
//  • Draggable panels
//  • Collapsible panels
//  • Focus mode (toggle, NOT mouse-leave)
//  • Scene selector
//  • Ambient buttons
//  • Notification
// ═══════════════════════════════════════════
const PF_UI = (() => {

  // ── Draggable panels ──
  function makeDraggable(panel, handle) {
    let startX, startY, startL, startT, dragging = false;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return; // don't drag on button clicks
      dragging = true;
      panel.classList.add('dragging');
      const rect = panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startL = rect.left;  startT = rect.top;
      // Neutralize CSS transforms/right/bottom so we can use left/top freely
      panel.style.left      = startL + 'px';
      panel.style.top       = startT + 'px';
      panel.style.right     = 'auto';
      panel.style.bottom    = 'auto';
      panel.style.transform = 'none';
      document.body.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newL = startL + dx;
      let newT = startT + dy;
      // Clamp to viewport
      newL = Math.max(0, Math.min(innerWidth  - panel.offsetWidth,  newL));
      newT = Math.max(0, Math.min(innerHeight - panel.offsetHeight, newT));
      panel.style.left = newL + 'px';
      panel.style.top  = newT + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('dragging');
      document.body.style.cursor = '';
    });
  }

  // ── Collapsible panels ──
  function makeCollapsible(panel) {
    const btn  = panel.querySelector('.p-min-btn');
    const body = panel.querySelector('.panel-body');
    if (!btn || !body) return;
    let collapsed = false;
    btn.addEventListener('click', () => {
      collapsed = !collapsed;
      body.classList.toggle('collapsed', collapsed);
      btn.textContent = collapsed ? '+' : '—';
      btn.title = collapsed ? 'Развернуть' : 'Свернуть';
    });
  }

  // ── Focus mode (TRUE toggle — no mouse-leave dismiss) ──
  let focusMode = false;

  function enterFocus() {
    focusMode = true;
    document.body.classList.add('focus-mode');
    document.getElementById('focus-exit').classList.remove('hidden');
  }
  function exitFocus() {
    focusMode = false;
    document.body.classList.remove('focus-mode');
    document.getElementById('focus-exit').classList.add('hidden');
  }
  function toggleFocus() { focusMode ? exitFocus() : enterFocus(); }

  // ── Notification ──
  let notifTO = null;
  function showNotif(msg, dur = 4500) {
    const el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(notifTO);
    notifTO = setTimeout(() => el.classList.remove('show'), dur);
  }

  // ── Accent color ──
  function applyAccent(acc) {
    document.documentElement.style.setProperty('--acc', acc);
    // Derive RGB for rgba usage
    const r = parseInt(acc.slice(1,3),16);
    const g = parseInt(acc.slice(3,5),16);
    const b = parseInt(acc.slice(5,7),16);
    if (!isNaN(r+g+b)) document.documentElement.style.setProperty('--acc-rgb', `${r},${g},${b}`);
  }

  // ── Bind all controls ──
  function bindControls() {

    // Draggable + collapsible for each panel
    [
      ['panel-timer',   'drag-timer'],
      ['panel-tasks',   'drag-tasks'],
      ['panel-player',  'drag-player'],
      ['panel-ambient', 'drag-ambient'],
    ].forEach(([pId, hId]) => {
      const panel  = document.getElementById(pId);
      const handle = document.getElementById(hId);
      if (panel && handle) {
        makeDraggable(panel, handle);
        makeCollapsible(panel);
      }
    });

    // Focus button
    document.getElementById('focus-btn').addEventListener('click', toggleFocus);
    document.getElementById('exit-focus-btn').addEventListener('click', exitFocus);

    // Scene buttons
    document.querySelectorAll('.scene-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        window.PF.scene = btn.dataset.scene;
        applyAccent(PF_Canvas.getSceneAcc(btn.dataset.scene));
        PF_Timer.render();
        // reset birds
        PF_Canvas.birds.forEach(b => b.reset(true));
      });
    });

    // Ambient buttons
    document.querySelectorAll('.amb-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        PF_Audio.initAC();
        const key = btn.dataset.amb;
        const on  = await PF_Audio.toggle(key);
        btn.classList.toggle('on', on);
      });
    });

    // Ambient volume
    document.getElementById('amb-vol').addEventListener('input', e => {
      PF_Audio.setAmbVol(e.target.value / 100);
      document.getElementById('amb-vol-val').textContent = e.target.value;
    });

    // Stats modal backdrop click
    document.getElementById('stats-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

    // Lightning → thunder sound
    window.PF.onLightning = () => {
      if (PF_Audio.ambState.thunder) PF_Audio.playThunder();
    };

    // Apply initial accent
    applyAccent(PF_Canvas.getSceneAcc(window.PF.scene));
  }

  // ── Telegram hint (every 5 min, 10 sec display, not in focus mode) ──
  const TG_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const TG_DURATION = 10 * 1000;     // 10 seconds visible
  let tgTO = null;

  function showTgHint() {
    if (focusMode) return; // never in focus mode
    const el = document.getElementById('tg-hint');
    el.classList.add('visible');
    clearTimeout(tgTO);
    tgTO = setTimeout(() => el.classList.remove('visible'), TG_DURATION);
  }
  // Kick off the 5-min loop
  setInterval(showTgHint, TG_INTERVAL);

  // Load Telegram username from config.txt
  async function loadTgConfig() {
    try {
      const res = await fetch('config.txt', { cache: 'no-cache' });
      if (!res.ok) return;
      const text = await res.text();
      const match = text.match(/TELEGRAM\s*=\s*(@?\S+)/i);
      if (!match) return;
      let handle = match[1].trim().replace(/^@/, '');
      document.getElementById('tg-link').href = `https://t.me/${handle}`;
      document.getElementById('tg-hint-txt').textContent = `@${handle}`;
    } catch { /* файл не найден — используем дефолт */ }
  }
  loadTgConfig();

  return { bindControls, showNotif, applyAccent };
})();

// ═══════════════════════════════════════════
//  MAIN  (main.js)
//  Bootstrap — init all modules
// ═══════════════════════════════════════════

// Global state
window.PF = {
  scene: 'rain',
  onLightning: null,
};

// Init order matters: canvas is already running its loop
// Bind all UI controls
PF_UI.bindControls();
PF_Timer.bindControls();
PF_Timer.render();
PF_Tasks.bindControls();
PF_Player.bindControls();
PF_Player.loadPlaylist();

console.log('%c PixelFocus 2.0 ', 'background:#4488ff;color:#fff;font-size:14px;border-radius:4px;padding:4px 10px;');
console.log('🎵 Space = Play/Pause   Alt+← → Prev/Next track');
console.log('👁 Фокус режим — только кнопка выходит, не мышь!');

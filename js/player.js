// ═══════════════════════════════════════════
//  MUSIC PLAYER  (player.js)
//
//  Порядок загрузки треков:
//  1. window.PF_PLAYLIST  (из js/playlist-data.js — работает везде)
//  2. fetch('playlist.json')  (запасной, для веб-серверов)
//  3. Пусто — показывает подсказку
// ═══════════════════════════════════════════
const PF_Player = (() => {
  const audio   = new Audio();
  audio.preload = 'metadata';

  let playlist  = [];
  let curIdx    = 0;
  let isPlaying = false;
  let isShuffle = false;
  let isLoop    = false;

  const D = id => document.getElementById(id);

  function fmtTime(s) {
    s = Math.floor(s || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Загрузка плейлиста ──
  async function loadPlaylist() {

    // 1. Встроенные данные из playlist-data.js (работает с file://)
    if (Array.isArray(window.PF_PLAYLIST) && window.PF_PLAYLIST.length > 0) {
      playlist = window.PF_PLAYLIST.filter(t => t && t.file);
    }

    // 2. Если не нашли — пробуем fetch playlist.json
    if (playlist.length === 0) {
      try {
        const res = await fetch('playlist.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          playlist = (data.tracks || []).filter(t => t && t.file);
        }
      } catch (e) {
        // file:// или сервер не отвечает — ничего страшного
        console.warn('PixelFocus: не удалось загрузить playlist.json', e);
      }
    }

    if (playlist.length === 0) {
      D('track-title-txt').textContent = 'нет треков';
      D('track-sub').textContent       = '→ запусти generate_playlist.py';
    } else {
      loadTrack(0, false);
      console.log(`PixelFocus: загружено ${playlist.length} треков`);
    }
  }

  function loadTrack(idx, autoPlay = false) {
    if (!playlist.length) return;
    curIdx = ((idx % playlist.length) + playlist.length) % playlist.length;
    const t = playlist[curIdx];
    audio.src = `audio/music/${t.file}`;
    audio.load();
    D('track-title-txt').textContent = t.title || t.file;
    D('track-sub').textContent       = `${curIdx + 1} / ${playlist.length}`;
    D('player-bar').style.width      = '0%';
    D('t-cur').textContent           = '0:00';
    D('t-tot').textContent           = '—:——';
    checkMarquee(t.title || t.file);
    if (autoPlay) { audio.play().catch(() => {}); isPlaying = true; updatePlayBtn(); }
  }

  function checkMarquee(title) {
    D('track-title')?.classList.toggle('marquee-active', title.length > 20);
  }

  function play() {
    if (!playlist.length) return;
    PF_Audio.initAC();
    audio.play().catch(() => {});
    isPlaying = true; updatePlayBtn();
    D('body-player')?.classList.add('playing');
    D('track-art').textContent = '▶';
  }
  function pause() {
    audio.pause(); isPlaying = false; updatePlayBtn();
    D('body-player')?.classList.remove('playing');
    D('track-art').textContent = '♪';
  }
  function togglePlay() { isPlaying ? pause() : play(); }

  function prev() { loadTrack(isShuffle ? randIdx() : curIdx - 1, isPlaying); }
  function next() { loadTrack(isShuffle ? randIdx() : curIdx + 1, isPlaying); }

  function randIdx() {
    if (playlist.length <= 1) return 0;
    let n; do { n = Math.floor(Math.random() * playlist.length); } while (n === curIdx);
    return n;
  }

  function updatePlayBtn() {
    const b = D('btn-play-pause');
    if (b) b.textContent = isPlaying ? '⏸' : '▶';
  }

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    D('player-bar').style.width = ((audio.currentTime / audio.duration) * 100) + '%';
    D('t-cur').textContent      = fmtTime(audio.currentTime);
    D('t-tot').textContent      = fmtTime(audio.duration);
  });
  audio.addEventListener('ended', () => {
    if (isLoop) { audio.currentTime = 0; audio.play().catch(() => {}); }
    else next();
  });
  audio.addEventListener('loadedmetadata', () => {
    D('t-tot').textContent = fmtTime(audio.duration);
  });
  audio.addEventListener('error', () => {
    if (playlist.length) D('track-sub').textContent = '⚠ файл не найден';
  });

  document.getElementById('player-progress')?.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = document.getElementById('player-progress').getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  function setVolume(v) { audio.volume = v; }

  function bindControls() {
    const G = id => document.getElementById(id);
    G('btn-play-pause')?.addEventListener('click', togglePlay);
    G('btn-prev')?.addEventListener('click', prev);
    G('btn-next')?.addEventListener('click', next);
    G('btn-shuffle')?.addEventListener('click', () => {
      isShuffle = !isShuffle;
      G('btn-shuffle').classList.toggle('active', isShuffle);
    });
    G('btn-loop')?.addEventListener('click', () => {
      isLoop = !isLoop;
      G('btn-loop').classList.toggle('active', isLoop);
    });
    G('music-vol')?.addEventListener('input', e => {
      setVolume(e.target.value / 100);
      G('music-vol-val').textContent = e.target.value;
    });
  }

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space')                  { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight' && e.altKey) next();
    if (e.code === 'ArrowLeft'  && e.altKey) prev();
  });

  return { loadPlaylist, bindControls, play, pause, togglePlay, next, prev, setVolume, isPlaying: () => isPlaying };
})();

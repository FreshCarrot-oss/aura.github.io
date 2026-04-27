// ═══════════════════════════════════════════
//  CANVAS ENGINE  (canvas.js)
// ═══════════════════════════════════════════
const PF_Canvas = (() => {
  const canvas = document.getElementById('display');
  const ctx    = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const VW = 320, VH = 180, GY = 124;
  const off = document.createElement('canvas');
  off.width = VW; off.height = VH;
  const oc = off.getContext('2d');
  oc.imageSmoothingEnabled = false;

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  window.addEventListener('resize', resize); resize();

  // ── Helpers ──
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const rndI = (a, b) => Math.floor(rnd(a, b));
  const px   = (x, y, w, h, c) => { oc.fillStyle = c; oc.fillRect(Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)); };
  const spr  = (g, x, y, pal, sc = 1) => {
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[r].length; c++) {
        const v = g[r][c]; if (v && pal[v]) px(x + c*sc, y + r*sc, sc, sc, pal[v]);
      }
  };

  // ── Scene configs ──
  const SCENES = {
    rain:    { skyT:'#050d1f', skyB:'#0e1c3c', gnd:'#0a1018', gndH:'#12202e', acc:'#4488ff', fog:'rgba(15,40,90,.42)', cloudC:'#1a2f55' },
    snow:    { skyT:'#0e0825', skyB:'#1a0f3a', gnd:'#c0cce0', gndH:'#d0dced', acc:'#99aaff', fog:'rgba(195,210,240,.22)', cloudC:'#281e48' },
    sunny:   { skyT:'#e87033', skyB:'#f0a055', gnd:'#2d6e28', gndH:'#3e8c36', acc:'#ffdd44', fog:'rgba(255,170,70,.07)', cloudC:'rgba(255,255,255,.88)' },
    thunder: { skyT:'#020304', skyB:'#060710', gnd:'#040509', gndH:'#07090e', acc:'#7788ee', fog:'rgba(5,10,30,.72)', cloudC:'#04040a' },
    night:   { skyT:'#010206', skyB:'#04091a', gnd:'#060c16', gndH:'#0a1320', acc:'#ffcc55', fog:'rgba(5,15,40,.48)', cloudC:'rgba(8,12,30,.85)' },
    sakura:  { skyT:'#f0b0cc', skyB:'#fad4e8', gnd:'#d0e8b8', gndH:'#c2dca0', acc:'#ff88bb', fog:'rgba(255,195,220,.14)', cloudC:'rgba(255,255,255,.82)' },
  };

  // current scene is shared via PF.scene
  const getScene = () => SCENES[window.PF?.scene || 'rain'];

  // ── Sprites ──
  const SPR = {
    cloud:  [[0,0,0,1,1,1,0,0,0],[0,0,1,1,1,1,1,0,0],[0,1,1,2,1,1,1,1,0],[1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,0],[0,1,1,1,1,1,1,0,0]],
    moon:   [[0,1,1,1,0],[1,1,2,1,0],[1,2,1,1,0],[1,1,1,1,0],[0,1,1,0,0]],
    sun:    [[0,0,1,0,1,0,0],[0,0,0,1,0,0,0],[1,0,2,2,2,0,1],[0,1,2,3,2,1,0],[1,0,2,2,2,0,1],[0,0,0,1,0,0,0],[0,0,1,0,1,0,0]],
    bolt:   [[0,0,1,1],[0,1,1,0],[1,1,0,0],[0,1,1,0],[0,0,1,0],[0,1,1,0],[0,0,1,0]],
    lamp:   [[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1],[0,0,0],[1,0,1]],
    bird_a: [[0,1,0,1,0],[1,1,1,1,1],[0,0,0,0,0]],
    bird_b: [[0,0,0,0,0],[1,1,1,1,1],[0,1,0,1,0]],
    bat_a:  [[1,0,0,0,0,0,1],[1,1,0,0,0,1,1],[0,0,1,0,1,0,0]],
    bat_b:  [[0,0,0,0,0,0,0],[1,1,1,0,1,1,1],[1,0,0,1,0,0,1]],
    petal:  [[0,1,0],[1,2,1],[0,1,0]],
    flake:  [[0,1,0,1,0],[1,0,1,0,1],[0,1,1,1,0],[1,0,1,0,1],[0,1,0,1,0]],
  };

  // ── Buildings ──
  const bldgCache = {};
  function makeBuildings() {
    const arr = []; let x = -2;
    while (x < VW + 5) {
      const w = rndI(9, 24), h = rndI(20, 58);
      const wins = [];
      for (let wy = h - 6; wy > 5; wy -= rndI(3, 6))
        for (let wx = 2; wx < w - 2; wx += rndI(3, 6))
          wins.push({ x: wx, y: wy, on: Math.random() > .38 });
      arr.push({ x, w, h, wins, ant: Math.random() > .6 });
      x += w + rndI(0, 4);
    }
    return arr;
  }
  function getBldgs(scn) { if (!bldgCache[scn]) bldgCache[scn] = makeBuildings(); return bldgCache[scn]; }
  function drawBuildings(scn) {
    const s = SCENES[scn];
    const isDark = ['sunny','sakura'].includes(scn);
    const wallC = isDark ? '#2a3e20' : scn === 'snow' ? '#b0c2dc' : '#081018';
    const rimC  = isDark ? '#3a5030' : scn === 'snow' ? '#c8d8f0' : '#0f1e2e';
    for (const b of getBldgs(scn)) {
      const ty = GY - b.h;
      px(b.x, ty, b.w, b.h, wallC);
      px(b.x, ty, b.w, 1, rimC);
      if (b.ant) px(b.x + Math.floor(b.w/2), ty - rndI(3,7), 1, rndI(3,7), rimC);
      for (const w of b.wins) if (w.on) px(b.x + w.x, ty + w.y, 2, 2, s.acc);
    }
  }

  // ── Lamps ──
  const LAMP_X = [30, 92, 158, 224, 290];
  function drawLamps(scn) {
    const s  = SCENES[scn];
    const on = ['rain','thunder','night','snow'].includes(scn);
    for (const lx of LAMP_X) {
      spr(SPR.lamp, lx, GY - SPR.lamp.length * 2, { 1: '#606878' }, 2);
      if (on) {
        const grd = oc.createRadialGradient(lx+3, GY-22, 0, lx+3, GY-22, 16);
        grd.addColorStop(0, s.acc + '44'); grd.addColorStop(1, 'transparent');
        oc.fillStyle = grd; oc.beginPath(); oc.arc(lx+3, GY-22, 16, 0, Math.PI*2); oc.fill();
        px(lx+2, GY-25, 3, 3, '#ffffc0');
      }
    }
  }

  // ── Character ──
  let charT = 0;
  function drawChar(scn) {
    charT++;
    const cx = 144, cy = GY;
    const H='#2a1508', SK='#f0c090', BD='#3a5080', DK='#60503a', SC='#5599ff', ARM='#4a6090';
    // head + hair
    px(cx+6, cy-20, 10, 3, H); px(cx+7, cy-17, 8, 7, SK);
    px(cx+8, cy-13, 2, 2, '#1a0808'); px(cx+12, cy-13, 2, 2, '#1a0808');
    // body
    px(cx+4, cy-10, 14, 8, BD);
    // arms + typing
    px(cx, cy-6, 4, 3, ARM); px(cx+18, cy-6, 4, 3, ARM);
    if (Math.floor(charT/15)%2 === 0) px(cx+18, cy-8, 4, 2, ARM);
    // legs
    px(cx+6, cy-2, 4, 4, BD); px(cx+12, cy-2, 4, 4, BD);
    px(cx+6, cy+2, 3, 4, '#2a2a3a'); px(cx+12, cy+2, 3, 4, '#2a2a3a');
    // desk
    px(cx-6, cy, 30, 3, DK); px(cx-4, cy+3, 4, 8, DK); px(cx+22, cy+3, 4, 8, DK);
    // laptop
    px(cx+16, cy-8, 12, 8, DK); px(cx+17, cy-7, 10, 6, SC);
    if (Math.floor(charT/25)%2 === 0) px(cx+18 + Math.floor(charT/10)%7, cy-3, 1, 1, '#fff');
    // screen glow at night/rain
    if (['night','thunder','rain'].includes(scn)) px(cx+14, cy-6, 10, 5, SC+'33');
    // coffee
    px(cx-2, cy-4, 5, 5, '#8b5e3c'); px(cx-2, cy-5, 5, 2, '#c8a060');
    if (!['thunder'].includes(scn) && Math.floor(charT/20)%3 !== 0) {
      const sa = Math.sin(charT*.1)*.8;
      px(cx+Math.floor(sa), cy-8, 1, 2, 'rgba(200,200,200,.25)');
    }
    // desk lamp
    px(cx+30, cy-4, 2, 6, '#788090'); px(cx+26, cy-5, 8, 3, '#888a40');
    px(cx+27, cy-3, 6, 2, 'rgba(255,240,150,.45)');
    // book
    px(cx+8, cy-4, 8, 4, '#a04030'); px(cx+9, cy-5, 6, 1, '#c05040');
  }

  // ── Trees ──
  const TREE_X = [2, 18, 290, 306];
  function drawTrees(scn) {
    if (scn === 'snow') {
      for (const x of TREE_X) {
        px(x+3, GY-20, 3, 8, '#506070'); px(x, GY-26, 10, 8, '#3a2860'); px(x+1, GY-27, 8, 3, '#d0e0f0');
      }
    } else if (scn === 'sunny') {
      for (const x of TREE_X) {
        px(x+3, GY-4, 4, 4, '#6a4020'); px(x, GY-18, 10, 12, '#266020'); px(x+2, GY-20, 6, 4, '#358030');
      }
    } else if (scn === 'sakura') {
      for (const x of TREE_X) {
        px(x+3, GY-4, 4, 4, '#7a5030'); px(x, GY-22, 10, 16, '#e880a8'); px(x+1, GY-24, 8, 6, '#f0aac0');
      }
    }
  }

  // ── Particles ──
  class Rain {
    constructor(h) { this.h = h; this.reset(true); }
    reset(i) { this.x = rnd(0,VW); this.y = i?rnd(-VH,VH):rnd(-20,-2); this.spd = this.h?rnd(5,9):rnd(3,6); this.len = rndI(2,this.h?6:5); this.a = rnd(.3,.75); }
    update() { this.x -= this.spd*.22; this.y += this.spd; if (this.y > VH+12) this.reset(); }
    draw() { const c = `rgba(160,205,255,${this.a})`; for (let i=0;i<this.len;i++) px(Math.floor(this.x-i*.3), Math.floor(this.y+i*1.5), 1, 1, c); }
  }
  class Splash {
    constructor() { this.reset(); }
    reset() { this.x=rnd(5,VW-5); this.t=rnd(0,Math.PI); this.spd=rnd(.05,.12); this.maxR=rnd(2,6); }
    update() { this.t+=this.spd; if(this.t>Math.PI) this.reset(); }
    draw() { const r=(this.t/Math.PI)*this.maxR; oc.strokeStyle=`rgba(140,180,255,${.25*(1-this.t/Math.PI)})`; oc.lineWidth=.5; oc.beginPath(); oc.ellipse(this.x,GY+2,r*2,r*.4,0,0,Math.PI*2); oc.stroke(); }
  }
  class Snowflake {
    constructor() { this.reset(true); }
    reset(i) { this.x=rnd(0,VW); this.y=i?rnd(-VH,VH):rnd(-5,0); this.spd=rnd(.3,1.2); this.t=rnd(0,Math.PI*2); this.sz=Math.random()>.65?2:1; this.a=rnd(.5,.95); this.big=Math.random()>.93; }
    update() { this.t+=.025; this.x+=Math.sin(this.t)*.5; this.y+=this.spd; if(this.y>VH+4) this.reset(); }
    draw() { this.big ? spr(SPR.flake, Math.floor(this.x), Math.floor(this.y), {1:`rgba(210,230,255,${this.a*.7})`}) : px(Math.floor(this.x), Math.floor(this.y), this.sz, this.sz, `rgba(215,232,255,${this.a})`); }
  }
  class Star {
    constructor() { this.init(); }
    init() { this.x=rndI(0,VW); this.y=rndI(0,Math.floor(VH*.62)); this.ph=rnd(0,Math.PI*2); this.spd=rnd(.02,.07); this.big=Math.random()>.88; }
    update() { this.ph+=this.spd; }
    draw() { const b=.35+.65*Math.sin(this.ph); this.big ? px(this.x,this.y,2,1,`rgba(255,255,210,${b})`) : px(this.x,this.y,1,1,`rgba(255,255,200,${b})`); }
  }
  class Cloud {
    constructor(x,y,spd,sc,a) { this.x=x; this.y=y; this.spd=spd; this.sc=sc; this.a=a; }
    update() { this.x+=this.spd; if(this.x>VW+60) this.x=-60; }
    draw(c) { oc.globalAlpha=this.a; spr(SPR.cloud, Math.floor(this.x), Math.floor(this.y), {1:c,2:'rgba(255,255,255,.15)'}, this.sc); oc.globalAlpha=1; }
  }
  class Bird {
    constructor() { this.reset(true); }
    reset(i) { this.x=i?rnd(0,VW):-15; this.y=rnd(VH*.06,VH*.42); this.spd=rnd(.35,1.1); this.t=rndI(0,24); this.sc=Math.random()>.5?1:2; }
    update() { this.t++; this.x+=this.spd; if(this.x>VW+20) this.reset(); }
    draw(scn) {
      const isN = scn==='night'||scn==='thunder';
      const frame = (Math.floor(this.t/8)%2)===0;
      const g = isN?(frame?SPR.bat_a:SPR.bat_b):(frame?SPR.bird_a:SPR.bird_b);
      spr(g, Math.floor(this.x), Math.floor(this.y), {1:isN?'#222233':'#33333a'}, this.sc);
    }
  }
  class Petal {
    constructor() { this.reset(true); }
    reset(i) { this.x=rnd(0,VW); this.y=i?rnd(-VH,VH):rnd(-10,0); this.t=rnd(0,Math.PI*2); this.spd=rnd(.25,.8); }
    update() { this.t+=.03; this.x+=Math.sin(this.t)*.7; this.y+=this.spd; if(this.y>VH+6) this.reset(); }
    draw() { spr(SPR.petal, Math.floor(this.x), Math.floor(this.y), {1:'#ffaac8',2:'#ff88b0'}); }
  }
  class Firefly {
    constructor() { this.init(); }
    init() { this.x=rnd(5,VW-5); this.y=rnd(GY-55,GY-8); this.ph=rnd(0,Math.PI*2); this.vx=rnd(-.3,.3); this.vy=rnd(-.2,.2); }
    update() { this.ph+=.05; this.x+=this.vx+Math.sin(this.ph*.3)*.2; this.y+=this.vy+Math.cos(this.ph*.2)*.15; if(this.x<0||this.x>VW||this.y>GY||this.y<GY-60) this.init(); }
    draw() { const b=Math.sin(this.ph)*.5+.5; if(b>.4) px(Math.floor(this.x),Math.floor(this.y),1,1,`rgba(200,255,100,${b})`); }
  }

  // Lightning
  // 3–6 min at ~60fps: 3×60×60=10800 … 6×60×60=21600
  let ltTimer=rndI(10800,21600), ltFlash=0, ltX=120;
  function tickLt(scn) {
    if (scn!=='thunder') return;
    if (--ltTimer <= 0) { ltFlash=1; ltX=rndI(60,230); ltTimer=rndI(10800,21600); window.PF?.onLightning?.(); }
    if (ltFlash>0) ltFlash = Math.max(0, ltFlash-.04);
  }
  function drawLt() {
    if (ltFlash<=0) return;
    px(0,0,VW,GY,`rgba(180,200,255,${ltFlash*.28})`);
    if (ltFlash>.55) spr(SPR.bolt, ltX, 6, {1:`rgba(210,225,255,${ltFlash*.9})`}, 2);
  }

  // Sun / Moon
  let sunAng=0, moonPh=0;
  function drawSun() {
    sunAng+=.007;
    const cx=245,cy=28;
    const g=oc.createRadialGradient(cx,cy,4,cx,cy,22);
    g.addColorStop(0,'rgba(255,200,50,.3)'); g.addColorStop(1,'transparent');
    oc.fillStyle=g; oc.beginPath(); oc.arc(cx,cy,22,0,Math.PI*2); oc.fill();
    spr(SPR.sun,cx-7,cy-7,{1:'#ffcc20',2:'#ffee60',3:'#ffffc0'},2);
  }
  function drawMoon() {
    moonPh+=.003;
    const cx=258,cy=22;
    const g=oc.createRadialGradient(cx,cy,5,cx,cy,20);
    g.addColorStop(0,`rgba(200,220,255,${.2+Math.sin(moonPh)*.07})`); g.addColorStop(1,'transparent');
    oc.fillStyle=g; oc.beginPath(); oc.arc(cx,cy,20,0,Math.PI*2); oc.fill();
    spr(SPR.moon,cx-5,cy-6,{1:'#c8d4f2',2:'rgba(180,195,230,.5)'},2);
  }

  // Init pools
  const rainD   = Array.from({length:100}, ()=>new Rain(false));
  const heavyR  = Array.from({length:200}, ()=>new Rain(true));
  const flakes  = Array.from({length:120}, ()=>new Snowflake());
  const stars   = Array.from({length:80},  ()=>new Star());
  const splashs = Array.from({length:14},  ()=>new Splash());
  const birds   = Array.from({length:8},   ()=>new Bird());
  const petals  = Array.from({length:45},  ()=>new Petal());
  const flies   = Array.from({length:14},  ()=>new Firefly());
  const clouds  = [
    new Cloud(10,4,.09,2,.78), new Cloud(95,8,.06,3,.55),
    new Cloud(175,3,.11,2,.82),new Cloud(245,11,.07,3,.62),
    new Cloud(52,18,.08,2,.5), new Cloud(142,14,.05,2,.45),
  ];

  // ── MAIN RENDER ──
  function drawFrame() {
    const scn = window.PF?.scene || 'rain';
    const s   = SCENES[scn];
    oc.clearRect(0,0,VW,VH);

    // Sky
    const sg = oc.createLinearGradient(0,0,0,GY);
    sg.addColorStop(0,s.skyT); sg.addColorStop(1,s.skyB);
    oc.fillStyle=sg; oc.fillRect(0,0,VW,GY);

    // Celestial
    if (['sunny','sakura'].includes(scn)) drawSun();
    if (['night','rain','thunder'].includes(scn)) drawMoon();
    if (scn==='night') for (const st of stars) { st.update(); st.draw(); }

    // Clouds
    for (const cl of clouds) { cl.update(); cl.draw(s.cloudC); }

    // Birds / bats
    if (scn!=='thunder') for (const b of birds) { b.update(); b.draw(scn); }

    // Buildings
    if (!['sunny','sakura'].includes(scn)) drawBuildings(scn);

    // Trees
    drawTrees(scn);

    // Lamps
    drawLamps(scn);

    // Character
    drawChar(scn);

    // Ground
    const gg = oc.createLinearGradient(0,GY,0,VH);
    gg.addColorStop(0,s.gndH); gg.addColorStop(1,s.gnd);
    oc.fillStyle=gg; oc.fillRect(0,GY,VW,VH-GY);
    px(0,GY,VW,1,s.gndH);

    // Wet ground
    if (['rain','thunder','night'].includes(scn)) {
      oc.fillStyle='rgba(30,80,180,.1)'; oc.fillRect(0,GY+1,VW,VH-GY-1);
      for (const sp of splashs) { sp.update(); sp.draw(); }
    }
    if (scn==='snow') for (let sx=0;sx<VW;sx+=3) px(sx,GY,3,rndI(1,3),'#d0e0f2');
    if (scn==='sakura') for (let sx=0;sx<VW;sx+=8) px(sx+rndI(0,5),GY,2,1,'#ffaac8');

    // Fireflies
    if (['night','sakura'].includes(scn)) for (const f of flies) { f.update(); f.draw(); }

    // Particles
    if (scn==='rain')    for (const r of rainD)  { r.update(); r.draw(); }
    if (scn==='thunder') for (const r of heavyR) { r.update(); r.draw(); }
    if (scn==='snow')    for (const f of flakes) { f.update(); f.draw(); }
    if (scn==='sakura')  for (const p of petals) { p.update(); p.draw(); }

    // Lightning
    tickLt(scn); if (scn==='thunder') drawLt();

    // Fog
    const fg = oc.createLinearGradient(0,GY-35,0,VH);
    fg.addColorStop(0,'transparent'); fg.addColorStop(1,s.fog);
    oc.fillStyle=fg; oc.fillRect(0,GY-35,VW,VH-GY+35);

    // Blit
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  }

  (function loop() { drawFrame(); requestAnimationFrame(loop); })();

  // Expose accent getter
  return { getSceneAcc: (scn) => SCENES[scn]?.acc || '#4488ff', birds };
})();

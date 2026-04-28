/* ═══════════════════════════════════════════════════
   RetailShield v2 — Shared Logic
   ═══════════════════════════════════════════════════ */

const API = 'http://localhost:3001/api';

/* ── SESSION ──────────────────────────────────────── */
function getSession() {
  const role = sessionStorage.getItem('rs_role');
  const user = sessionStorage.getItem('rs_user') || 'User';
  if (!role) { window.location.href = 'index.html'; return null; }
  return { role, user };
}
function logout() { sessionStorage.clear(); window.location.href = 'index.html'; }

/* ── CLOCK ────────────────────────────────────────── */
function startClock(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = () => {
    const n = new Date();
    el.textContent = n.toLocaleTimeString('en-GB') + ' · ' +
      n.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  };
  tick(); setInterval(tick, 1000);
}

/* ── API ──────────────────────────────────────────── */
async function apiGet(path) {
  try { const r = await fetch(API + path, { signal: AbortSignal.timeout(2500) }); return await r.json(); }
  catch { return null; }
}
async function apiPost(path, body) {
  try {
    const r = await fetch(API + path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) });
    return await r.json();
  } catch { return null; }
}
async function apiPatch(path, body) {
  try {
    const r = await fetch(API + path, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(2500) });
    return await r.json();
  } catch { return null; }
}
async function apiDelete(path) {
  try {
    const r = await fetch(API + path, { method:'DELETE', signal: AbortSignal.timeout(2500) });
    return await r.json();
  } catch { return null; }
}

/* ── REGISTER ─────────────────────────────────────── */
function toggleRegister() {
  const loginCard = document.getElementById('login-card');
  const registerCard = document.getElementById('register-card');
  if (loginCard.style.display !== 'none') {
    loginCard.style.display = 'none';
    registerCard.style.display = 'block';
  } else {
    loginCard.style.display = 'block';
    registerCard.style.display = 'none';
    // Clear reg form
    ['reg-name','reg-email','reg-user','reg-pass'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('reg-role').value = 'staff';
  }
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const user  = document.getElementById('reg-user').value.trim();
  const pass  = document.getElementById('reg-pass').value.trim();
  const confirmPass = document.getElementById('reg-confirm-pass').value.trim();
  const store = document.getElementById('reg-store').value;
  const role  = document.getElementById('reg-role').value;
  const branch = document.getElementById('reg-branch').value;

  if (!name || !user || !pass || !confirmPass || !store || user.length < 3 || pass.length < 4 || pass !== confirmPass) {
    toast('Invalid Input', 'Fill all fields. Username ≥3, password ≥4 chars. Passwords must match.', 'error');
    return;
  }

  const body = { username: user, password: pass, role, name, email, store, branch };
  const res = await apiPost('/users/register', body);

  if (res?.success) {
    toast('Account Created!', `Welcome ${name}! You can now sign in.`, 'success');
    toggleRegister(); // back to login
  } else {
    const err = res?.error || 'Registration failed. Try again.';
    toast('Registration Error', err, 'error');
  }
}

/* ── TIME HELPERS ─────────────────────────────────── */
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}
function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-GB'); }
function fmtDT(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
}

/* ── TOAST ────────────────────────────────────────── */
function toast(title, msg, type = 'info', ms = 4000) {
  let c = document.getElementById('toast-container');
  if (!c) { c = Object.assign(document.createElement('div'), {id:'toast-container'}); document.body.appendChild(c); }
  const icons = { error:'🚨', warn:'⚠️', success:'✅', info:'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast t-${type}`;
  t.innerHTML = `<div class="toast-icon">${icons[type]||'ℹ️'}</div><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-text">${msg}</div></div>`;
  t.onclick = () => t.remove();
  c.prepend(t);
  setTimeout(() => t?.remove(), ms);
}

/* ── SIDEBAR NAV ──────────────────────────────────── */
function initNav(defaultSection) {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const target = document.getElementById('view-' + item.dataset.view);
      if (target) target.classList.add('active');
      const titleEl = document.getElementById('topbar-title');
      if (titleEl) titleEl.textContent = item.querySelector('.label')?.textContent || '';
    });
  });
  // Activate default
  if (defaultSection) {
    document.querySelector(`[data-view="${defaultSection}"]`)?.click();
  }
}

/* ── AI ALERT ENGINE ──────────────────────────────── */
const ALERT_TEMPLATES = [
  { msg:'Person concealing item in jacket near display',       zone:'Electronics',    cam:'CAM-03', sev:'high'   },
  { msg:'Suspicious lingering at self-checkout — no items',    zone:'Self-Checkout',  cam:'CAM-08', sev:'high'   },
  { msg:'Bag swap detected near clothing rack',                zone:'Clothing',       cam:'CAM-06', sev:'high'   },
  { msg:'Group distraction pattern near checkout',             zone:'Checkout',       cam:'CAM-02', sev:'high'   },
  { msg:'Item removed from shelf, not placed in cart',         zone:'Aisle 4',        cam:'CAM-05', sev:'medium' },
  { msg:'Customer returned to same aisle 4× in 10 min',       zone:'Aisle 2',        cam:'CAM-04', sev:'medium' },
  { msg:'Fitting room occupied over 20 minutes',               zone:'Fitting Rooms',  cam:'CAM-07', sev:'medium' },
  { msg:'Unattended bag flagged near entrance',                zone:'Entrance',       cam:'CAM-01', sev:'medium' },
  { msg:'Scan mismatch at self-checkout terminal',             zone:'Self-Checkout',  cam:'CAM-08', sev:'medium' },
  { msg:'Low-confidence movement pattern in aisle',            zone:'Aisle 6',        cam:'CAM-05', sev:'low'    },
  { msg:'Customer browsing without basket (routine check)',    zone:'Aisle 1',        cam:'CAM-01', sev:'low'    },
];

function genAlert() {
  const t = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];
  return { ...t, id:'ALT-'+Date.now(), timestamp: new Date().toISOString(), confidence: 70+Math.floor(Math.random()*29), acked: false };
}

/* ── IN-MEMORY STORE ──────────────────────────────── */
const store = { alerts: [] };

// Pre-populate historical alerts
for (let i = 20; i >= 1; i--) {
  const a = genAlert();
  a.timestamp = new Date(Date.now() - i * 9 * 60000).toISOString();
  a.acked = Math.random() > 0.45;
  store.alerts.push(a);
}

/* ── CHART DEFAULTS ───────────────────────────────── */
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.font.size   = 11;
  Chart.defaults.color       = '#94a3b8';
  Chart.defaults.borderColor = '#e2e8f0';
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
}

const GRID = { color: '#f1f5f9' };
const TICK = { color: '#94a3b8' };

function lineOpts(legend = true) {
  return {
    responsive: true, maintainAspectRatio: true,
    interaction: { mode:'index', intersect:false },
    plugins: { legend: { display: legend } },
    scales: { x: { grid: GRID, ticks: TICK }, y: { grid: GRID, ticks: TICK, beginAtZero: true } }
  };
}
function barOpts(horizontal = false) {
  return {
    responsive: true, maintainAspectRatio: true,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false } },
    scales: { x: { grid: GRID, ticks: TICK }, y: { grid: GRID, ticks: TICK, beginAtZero: true } }
  };
}
function donutOpts() {
  return {
    responsive: true, maintainAspectRatio: true, cutout: '65%',
    plugins: { legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true } } }
  };
}

/* ── DATA GENERATORS ──────────────────────────────── */
function randArr(n, lo, hi) { return Array.from({length:n}, () => lo + Math.floor(Math.random()*(hi-lo+1))); }
function last7Labels() {
  const d = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return Array.from({length:7}, (_,i) => d[new Date(Date.now()-(6-i)*864e5).getDay()]);
}
function last30Labels() {
  return Array.from({length:30}, (_,i) => {
    const d = new Date(Date.now()-(29-i)*864e5);
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  });
}
function hrLabels() { return Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00'); }

/* ── CAMERA CANVAS SIMULATOR ──────────────────────── */
function simCamera(canvas, camId) {
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], alertFlash = 0;

  function resize() {
    W = canvas.offsetWidth || 300;
    H = canvas.offsetHeight || 180;
    canvas.width  = W;
    canvas.height = H;
  }
  resize();

  function mkParticle() {
    return { x: Math.random()*W, y: H*.3 + Math.random()*H*.55,
      vx:(Math.random()-.5)*.5, vy:(Math.random()-.5)*.15,
      r: 3+Math.random()*4, life: 200+Math.random()*300 };
  }
  for (let i=0;i<6;i++) particles.push(mkParticle());

  let frame = 0;
  function draw() {
    frame++;
    // BG
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#07111f'); g.addColorStop(1,'#0d1e30');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // perspective grid
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .6;
    const vx = W/2, vy = H*.32;
    for (let i=0;i<=8;i++) { ctx.beginPath(); ctx.moveTo(vx,vy); ctx.lineTo(W/8*i,H); ctx.stroke(); }
    for (let i=1;i<=5;i++) {
      const t=i/5, y=vy+(H-vy)*t;
      ctx.beginPath(); ctx.moveTo(vx-(W/2)*t,y); ctx.lineTo(vx+(W/2)*t,y); ctx.stroke();
    }

    // people blobs
    particles = particles.filter(p=>p.life>0);
    if (particles.length < 5) particles.push(mkParticle());
    particles.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.x<0||p.x>W) p.vx*=-1;
      if(p.y<H*.28||p.y>H*.92) p.vy*=-1;
      ctx.save(); ctx.globalAlpha = .65;
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath(); ctx.arc(p.x, p.y-p.r*1.1, p.r*.55, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.globalAlpha = .45;
      ctx.fillRect(p.x-p.r*.38, p.y-p.r*.7, p.r*.76, p.r*1.3);
      ctx.restore();
    });

    // alert overlay
    if (alertFlash > 0) {
      ctx.fillStyle = `rgba(239,68,68,${alertFlash*.1})`; ctx.fillRect(0,0,W,H);
      const sp = particles[0];
      if (sp) {
        ctx.strokeStyle = `rgba(239,68,68,${alertFlash*.9})`; ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]);
        ctx.strokeRect(sp.x-14, sp.y-24, 28, 36); ctx.setLineDash([]);
      }
      alertFlash = Math.max(0, alertFlash-.014);
    }

    // scanline sweep
    const sy = ((frame*1.2) % (H+4)) - 2;
    const sg = ctx.createLinearGradient(0,sy-3,0,sy+3);
    sg.addColorStop(0,'transparent'); sg.addColorStop(.5,'rgba(99,102,241,.15)'); sg.addColorStop(1,'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0,sy-3,W,6);

    // timestamp
    ctx.fillStyle = 'rgba(125,211,252,.7)';
    ctx.font = `${Math.max(8,W*.033)}px 'DM Mono',monospace`;
    ctx.fillText(new Date().toLocaleTimeString('en-GB'), 6, H-6);

    requestAnimationFrame(draw);
  }
  draw();
  return { flash: () => { alertFlash = 1; } };
}

/* ── STORE MAP ────────────────────────────────────── */
function drawStoreMap(canvas, hotZones = []) {
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 500;
  const H = canvas.offsetHeight || 280;
  canvas.width = W; canvas.height = H;

  const zones = [
    { name:'Entrance',       x:.02, y:.7,  w:.2,  h:.27 },
    { name:'Checkout',       x:.02, y:.05, w:.2,  h:.28 },
    { name:'Electronics',   x:.25, y:.05, w:.22, h:.37 },
    { name:'Clothing',       x:.5,  y:.05, w:.2,  h:.37 },
    { name:'Self-Checkout',  x:.73, y:.05, w:.25, h:.22 },
    { name:'Aisle 1-3',     x:.25, y:.47, w:.22, h:.46 },
    { name:'Aisle 4-6',     x:.5,  y:.47, w:.2,  h:.46 },
    { name:'Fitting Rooms', x:.73, y:.32, w:.25, h:.25 },
    { name:'Storage',       x:.73, y:.62, w:.25, h:.31 },
  ];

  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,W,H);

  // grid
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = .5;
  for (let x=0;x<W;x+=20) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y=0;y<H;y+=20) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  zones.forEach(z => {
    const rx=z.x*W, ry=z.y*H, rw=z.w*W, rh=z.h*H;
    const hot = hotZones.includes(z.name);
    ctx.fillStyle   = hot ? 'rgba(239,68,68,.1)' : 'rgba(99,102,241,.04)';
    ctx.strokeStyle = hot ? 'rgba(239,68,68,.6)' : 'rgba(99,102,241,.25)';
    ctx.lineWidth   = hot ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(rx,ry,rw,rh,4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = hot ? '#ef4444' : '#6366f1';
    ctx.font = `${Math.max(8,rw*.11)}px 'DM Sans',sans-serif`;
    ctx.fillText(z.name, rx+6, ry+14, rw-10);

    if (hot) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(rx+rw-8, ry+8, 4, 0, Math.PI*2); ctx.fill();
    }
  });

  // camera markers
  [[.12,.04],[.36,.04],[.6,.04],[.86,.04],[.12,.6],[.36,.6],[.6,.6],[.86,.6]].forEach((p,i) => {
    ctx.fillStyle = '#6366f1';
    ctx.font = '10px serif';
    ctx.fillText('📷', p[0]*W-5, p[1]*H+6);
  });

  return { update: (hz) => { hotZones = hz; drawStoreMap(canvas, hz); } };
}

'use strict';
/* City Hub Navigator: a two-floor indoor map with Dijkstra routing. No dependencies. */
const SCALE = 0.15, WALK = 1.3, CORR_Y = 180;       // metres per px, walking speed (m/s), corridor centre line
// id, name, floor, x, y, w, h, type
const DATA = [
  ['permits', 'Permits Office', 0, 40, 40, 130, 110], ['library', 'Library', 0, 180, 40, 130, 110],
  ['cafe', 'Café', 0, 320, 40, 110, 110], ['clinic', 'Clinic', 0, 440, 40, 120, 110],
  ['lobby', 'Main Lobby', 0, 40, 210, 120, 110], ['info', 'Info Desk', 0, 170, 210, 100, 110],
  ['transport', 'Transport Hub', 0, 280, 210, 140, 110], ['wc0', 'Restrooms', 0, 430, 210, 55, 110],
  ['stairs-0', 'Stairs', 0, 495, 210, 50, 110, 'stairs'], ['lift-0', 'Elevator', 0, 555, 210, 45, 110, 'lift'],
  ['council', 'City Council', 1, 40, 40, 160, 110], ['archive', 'Archive', 1, 210, 40, 120, 110],
  ['cowork', 'Co-working', 1, 340, 40, 140, 110], ['ops', 'Smart Ops Center', 1, 490, 40, 100, 110],
  ['lab', 'Innovation Lab', 1, 40, 210, 140, 110], ['meetA', 'Meeting A', 1, 190, 210, 110, 110],
  ['meetB', 'Meeting B', 1, 310, 210, 110, 110], ['wc1', 'Restrooms', 1, 430, 210, 55, 110],
  ['stairs-1', 'Stairs', 1, 495, 210, 50, 110, 'stairs'], ['lift-1', 'Elevator', 1, 555, 210, 45, 110, 'lift']
];
const ROOMS = {};
DATA.forEach(([id, name, f, x, y, w, h, t]) => ROOMS[id] = { id, name, f, x, y, w, h, t: t || 'room', dx: x + w / 2, dy: y < CORR_Y ? y + h : y });

/* ---------- graph: corridor nodes joined in order, plus stairs and lift links between floors ---------- */
const adj = {};
const link = (a, b, w, kind) => { (adj[a] = adj[a] || []).push({ to: b, w, kind }); (adj[b] = adj[b] || []).push({ to: a, w, kind }); };
[0, 1].forEach(f => {
  const list = Object.values(ROOMS).filter(r => r.f === f).sort((a, b) => a.dx - b.dx);
  for (let i = 1; i < list.length; i++) link(list[i - 1].id, list[i].id, (list[i].dx - list[i - 1].dx) * SCALE, 'walk');
});
link('stairs-0', 'stairs-1', 8, 'stairs');
link('lift-0', 'lift-1', 10, 'lift');

function shortest(from, to, stepFree) {
  const dist = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(ROOMS));
  while (todo.size) {
    let u = null; todo.forEach(k => { if (dist[k] !== undefined && (u === null || dist[k] < dist[u])) u = k; });
    if (u === null || u === to) break;
    todo.delete(u);
    for (const e of adj[u] || []) {
      if (stepFree && e.kind === 'stairs') continue;
      const d = dist[u] + e.w;
      if (dist[e.to] === undefined || d < dist[e.to]) { dist[e.to] = d; prev[e.to] = u; }
    }
  }
  if (dist[to] === undefined) return null;
  const path = [to]; while (path[0] !== from) path.unshift(prev[path[0]]);
  return { path, dist: dist[to] };
}

/* ---------- directions ---------- */
function directions(path) {
  const out = [], first = ROOMS[path[0]], last = ROOMS[path[path.length - 1]];
  out.push(`Leave ${first.name} (floor ${first.f}) into the corridor.`);
  let run = 0, dir = 0;
  const flush = () => { if (run > 0) out.push(`Walk ${Math.round(run)} m ${dir > 0 ? 'east' : 'west'}.`); run = 0; };
  for (let i = 1; i < path.length; i++) {
    const a = ROOMS[path[i - 1]], b = ROOMS[path[i]];
    if (a.f !== b.f) { flush(); out.push(`Take the ${a.t === 'lift' ? 'elevator' : 'stairs'} ${b.f > a.f ? 'up' : 'down'} to floor ${b.f}.`); dir = 0; continue; }
    const d = Math.sign(b.dx - a.dx);
    if (run > 0 && d !== dir) flush();
    if (d) dir = d; run += Math.abs(b.dx - a.dx) * SCALE;
  }
  flush();
  const north = last.dy < CORR_Y, side = !dir ? (north ? 'north side' : 'south side') : ((dir > 0) === north ? 'left' : 'right');
  out.push(`${last.name} is on your ${side}. You have arrived.`);
  return out;
}

/* ---------- state and UI ---------- */
const $ = id => document.getElementById(id);
const state = { from: '', to: '', sf: false, floor: 0, route: null };
const selectable = Object.values(ROOMS).filter(r => r.t === 'room');

function fillSelects() {
  ['from', 'to'].forEach(id => {
    const sel = $(id); sel.innerHTML = '<option value="">Select a place</option>';
    [0, 1].forEach(f => {
      const g = document.createElement('optgroup'); g.label = 'Floor ' + f;
      selectable.filter(r => r.f === f).forEach(r => g.append(new Option(r.name, r.id)));
      sel.append(g);
    });
  });
}
function compute() {
  state.route = null;
  const sum = $('summary'), list = $('steps'); list.innerHTML = '';
  if (state.from && state.to && state.from === state.to) sum.textContent = 'You are already there. Pick a different destination.';
  else if (state.from && state.to) {
    state.route = shortest(state.from, state.to, state.sf);
    if (!state.route) sum.textContent = 'No route found with these settings.';
    else {
      const m = Math.round(state.route.dist), mins = Math.max(1, Math.round(m / WALK / 60));
      sum.textContent = `${m} m, about ${mins} min${state.sf ? ' (step-free)' : ''}`;
      directions(state.route.path).forEach(t => list.append(Object.assign(document.createElement('li'), { textContent: t })));
      state.floor = ROOMS[state.from].f;
    }
  } else sum.textContent = 'Choose a start and a destination.';
  $('from').value = state.from; $('to').value = state.to; $('sf').checked = state.sf;
  history.replaceState(null, '', state.from && state.to ? `#from=${state.from}&to=${state.to}&sf=${+state.sf}` : location.pathname);
  render();
}

function render() {
  const f = state.floor;
  let s = '<rect class="floor" x="8" y="8" width="624" height="344" rx="14"/><rect class="corridor" x="30" y="165" width="580" height="30"/>';
  Object.values(ROOMS).filter(r => r.f === f).forEach(r => {
    const cls = ['room', 't-' + r.t, r.w < 100 ? 'sm' : '', r.id === state.from ? 'from' : '', r.id === state.to ? 'to' : ''].join(' ');
    const clickable = r.t === 'room' ? 'tabindex="0" role="button"' : '';
    s += `<g class="${cls}" data-id="${r.id}" ${clickable} aria-label="${r.name}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="6"/><line class="door" x1="${r.dx - 12}" x2="${r.dx + 12}" y1="${r.dy}" y2="${r.dy}"/><text x="${r.dx}" y="${r.y + r.h / 2 + 4}">${r.name}</text></g>`;
  });
  if (state.route) {
    const segs = [[]]; let cur = segs[0];
    state.route.path.forEach((id, i, p) => {
      const r = ROOMS[id];
      if (i === 0) cur.push([r.dx, r.dy]);
      cur.push([r.dx, CORR_Y]);
      if (i < p.length - 1 && ROOMS[p[i + 1]].f !== r.f) { cur = []; segs.push(cur); }
    });
    const lastR = ROOMS[state.to]; segs[segs.length - 1].push([lastR.dx, lastR.dy]);
    let fl = ROOMS[state.from].f;
    segs.forEach(seg => { if (fl === f) s += `<polyline class="route" points="${seg.map(p => p.join(',')).join(' ')}"/>`; fl = 1 - fl; });
    if (ROOMS[state.from].f === f) s += `<circle class="start" cx="${ROOMS[state.from].dx}" cy="${CORR_Y}" r="8"/>`;
    if (lastR.f === f) s += `<circle class="end" cx="${lastR.dx}" cy="${CORR_Y}" r="8"/>`;
  }
  $('map').innerHTML = s;
  $('tabs').innerHTML = '';
  [0, 1].forEach(n => { const b = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Floor ' + n }); b.setAttribute('aria-pressed', n === f); b.onclick = () => { state.floor = n; render(); }; $('tabs').append(b); });
}

function pick(id) {
  if (ROOMS[id].t !== 'room') return;
  if (!state.from || (state.from && state.to)) { state.from = id; state.to = ''; } else state.to = id;
  compute();
}
$('map').addEventListener('click', e => { const g = e.target.closest('.room'); if (g) pick(g.dataset.id); });
$('map').addEventListener('keydown', e => { const g = e.target.closest('.room'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g.dataset.id); } });
$('from').onchange = e => { state.from = e.target.value; compute(); };
$('to').onchange = e => { state.to = e.target.value; compute(); };
$('sf').onchange = e => { state.sf = e.target.checked; compute(); };
$('swap').onclick = () => { [state.from, state.to] = [state.to, state.from]; compute(); };

fillSelects();
const q = new URLSearchParams(location.hash.slice(1));   // shareable links: #from=lobby&to=clinic&sf=1
if (ROOMS[q.get('from')] && ROOMS[q.get('to')]) { state.from = q.get('from'); state.to = q.get('to'); state.sf = q.get('sf') === '1'; }
compute();

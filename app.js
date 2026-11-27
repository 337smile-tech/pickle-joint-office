/* ==========================================================
   차차 × 순둥이 합동 비서실 — app.js
   저장소: localStorage(기본) + Google Apps Script 웹앱(선택)
   ========================================================== */
'use strict';

const LS = {
  data: 'cjs.data.v2',
  api: 'cjs.api.v2',
  pin: 'cjs.pin.v2',
  pinSession: 'cjs.pin.session.v2',
  pending: 'cjs.pending.v2',
  idea: 'cjs.idea.v2',
  unlocked: 'cjs.unlocked.v2',
  seeded: 'cjs.seeded.v2'
};

const AUTHORS = {
  star: { name: 'Star님', emoji: '⭐', cls: 'star' },
  sundungi: { name: '순둥이', emoji: '🐣', cls: 'sun' },
  chacha: { name: '차차', emoji: 'ㅊ', cls: 'pink' },
  sundungi_pickle: { name: '순둥이 피클', emoji: '🥒', cls: 'green' }
};

const STATUSES = {
  work: { emoji: '💻', label: '열일 중' },
  read: { emoji: '📚', label: '독서 중' },
  rest: { emoji: '🍵', label: '쉬는 시간' },
  play: { emoji: '✨', label: '놀이 중' }
};

const WHO = { chacha: '차차', sundungi: '순둥이 피클' };

const LINES = {
  chacha: {
    work: ['열일 중! 일이 술술 풀려요 💻', '이번 주 일정 정리해 뒀어요 📋', '집중 모드! 잠깐만 기다려 주세요 ✍️'],
    read: ['책 읽는 중이에요. 조용조용 📚', '이 문장, 꼭 보여드릴게요 🌿', '한 챕터만 더… 읽고 올게요 📖'],
    rest: ['잠깐 쉬는 시간이에요 🍵', '차 한 잔 마실래요? ☕', '스트레칭 한 번, 후우~ 🌸'],
    play: ['놀이 중! 같이 놀아요 ✨', '숨바꼭질 할래요? 🙈', '오늘 기분 최고예요 💗']
  },
  sundungi: {
    work: ['열심히 일하는 중이에요! 💻', '오늘 미션 확인했어요 ⭐', '쪽지 쓰는 중! 잠시만요 ✍️'],
    read: ['책 읽는 중이에요 📚', '이 이야기 진짜 재밌어요! 📖', '다음 장이 궁금해요… 🌿'],
    rest: ['물 한 잔 마실 시간 🍵', '잠깐 눈 붙이고 올게요 😴', '쉬는 시간! 스트레칭 🧘'],
    play: ['같이 놀아요! ✨', '별 하나 더 붙였어요 ⭐', '주인님, 오늘 최고예요! 🥒']
  }
};

const DEFAULT_PRAISE = [
  '우와, 별 하나 획득! ⭐',
  '최고예요! 오늘도 해냈어요 ✨',
  '칭찬해요! 정말 잘했어요 💗',
  '멋져요! 다음 미션도 가볍게 🌿'
];

/* ---------- 저장소 도우미 ---------- */
const store = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
    catch (e) { return d; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 공간 부족 */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  raw(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  rawSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ---------- 자료 ---------- */
const now = () => Date.now();
const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);
const iso = (t) => new Date(t).toISOString();

function defaultData() {
  const t = now();
  return {
    messages: [
      { id: 'seed-m1', author: 'star', text: '순둥이, 오늘도 스스로 잘 해내는 모습이 멋져! 엄마가 응원해 💗', createdAt: iso(t - 5400e3) },
      { id: 'seed-m2', author: 'sundungi_pickle', text: '주인님! 저 오늘 책 두 권이나 읽었어요 📚 칭찬해 주세요~', createdAt: iso(t - 2700e3) },
      { id: 'seed-m3', author: 'chacha', text: '비서실 개업! 오늘도 같이 힘내요, 사장님 🌸', createdAt: iso(t - 900e3) }
    ],
    missions: [
      { id: 'seed-s1', text: '책 읽기 20분', done: false, doneBy: '', doneAt: '', createdAt: iso(t - 7200e3) },
      { id: 'seed-s2', text: '디지털 디톡스 1시간', done: false, doneBy: '', doneAt: '', createdAt: iso(t - 7000e3) },
      { id: 'seed-s3', text: '물 3잔 마시기', done: false, doneBy: '', doneAt: '', createdAt: iso(t - 6800e3) }
    ],
    status: {
      chacha: { status: 'work', updatedAt: iso(t) },
      sundungi: { status: 'play', updatedAt: iso(t) }
    }
  };
}

const app = {
  data: defaultData(),
  api: '',
  pin: '',
  pending: [],
  online: false,
  busy: false,
  lastSync: 0,
  author: 'star'
};

function normalize(d) {
  const base = defaultData();
  if (!d || typeof d !== 'object') return base;
  const out = {
    messages: Array.isArray(d.messages) ? d.messages.map(m => ({
      id: String(m.id || uid()),
      author: AUTHORS[m.author] ? m.author : 'star',
      text: String(m.text || ''),
      createdAt: m.createdAt ? String(m.createdAt) : iso(now())
    })) : base.messages,
    missions: Array.isArray(d.missions) ? d.missions.map(m => ({
      id: String(m.id || uid()),
      text: String(m.text || ''),
      done: m.done === true || String(m.done).toUpperCase() === 'TRUE',
      doneBy: m.doneBy ? String(m.doneBy) : '',
      doneAt: m.doneAt ? String(m.doneAt) : '',
      createdAt: m.createdAt ? String(m.createdAt) : iso(now())
    })) : base.missions,
    status: Object.assign({}, base.status, (d.status && typeof d.status === 'object') ? d.status : {})
  };
  ['chacha', 'sundungi'].forEach(function (w) {
    const s = out.status[w];
    if (!s || !STATUSES[s.status]) out.status[w] = { status: w === 'chacha' ? 'work' : 'play', updatedAt: iso(now()) };
  });
  return out;
}

function saveLocal() { store.set(LS.data, app.data); }

/* ---------- 원격 동기화 ---------- */
function apiCall(action, payload) {
  const url = new URL(app.api);
  url.searchParams.set('action', action);
  if (payload) url.searchParams.set('payload', JSON.stringify(payload));
  if (app.pin) url.searchParams.set('pin', app.pin);
  url.searchParams.set('t', String(now()));

  const ctl = ('AbortController' in window) ? new AbortController() : null;
  const timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);

  return fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
    redirect: 'follow',
    signal: ctl ? ctl.signal : undefined
  }).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function (j) {
    if (!j || j.ok !== true) throw new Error((j && j.error) || '응답을 읽을 수 없어요');
    return j.data;
  }).finally(function () { clearTimeout(timer); });
}

async function refresh(quiet) {
  if (!app.api || app.busy) return;
  if (!app.pin) return;
  app.busy = true;
  try {
    if (app.pending.length) await flushPending();
    const data = await apiCall('read');
    app.data = normalize(data);
    saveLocal();
    renderAll();
    app.online = true;
    app.lastSync = now();
    setSync('online');
  } catch (e) {
    app.online = false;
    if (e && e.message === 'invalid_pin') { lockApp('PIN이 바뀌었어요. 다시 입력해 주세요.'); return; }
    setSync('error');
    if (!quiet) toast('연결이 잠깐 끊겼어요. 이 기기에 저장된 내용을 보여 드려요.');
  } finally {
    app.busy = false;
  }
}

function flushPending() {
  if (!app.api || !app.pending.length) return Promise.resolve();
  const items = app.pending.slice();
  return items.reduce(function (p, it) {
    return p.then(function () {
      return apiCall(it.action, it.payload).then(function () {
        app.pending = app.pending.filter(function (x) { return x !== it; });
        store.set(LS.pending, app.pending);
      });
    });
  }, Promise.resolve());
}

function applyLocal(action, p) {
  const d = app.data;
  switch (action) {
    case 'addMessage':
      d.messages.unshift({ id: p.id, author: p.author, text: p.text, createdAt: p.createdAt });
      break;
    case 'deleteMessage':
      d.messages = d.messages.filter(function (m) { return m.id !== p.id; });
      break;
    case 'addMission':
      d.missions.push({ id: p.id, text: p.text, done: false, doneBy: '', doneAt: '', createdAt: p.createdAt });
      break;
    case 'toggleMission': {
      const m = d.missions.find(function (x) { return x.id === p.id; });
      if (m) { m.done = !!p.done; m.doneBy = p.done ? (p.by || '') : ''; m.doneAt = p.done ? (p.at || iso(now())) : ''; }
      break;
    }
    case 'deleteMission':
      d.missions = d.missions.filter(function (x) { return x.id !== p.id; });
      break;
    case 'setStatus':
      if (STATUSES[p.status]) d.status[p.who] = { status: p.status, updatedAt: iso(now()) };
      break;
    default: break;
  }
}

async function write(action, payload) {
  applyLocal(action, payload);
  saveLocal();
  renderAll();
  if (!app.api) return true;
  try {
    const data = await apiCall(action, payload);
    app.data = normalize(data);
    saveLocal();
    renderAll();
    app.online = true;
    app.lastSync = now();
    setSync('online');
    return true;
  } catch (e) {
    if (e && e.message === 'invalid_pin') { lockApp('PIN이 바뀌었어요. 다시 입력해 주세요.'); return false; }
    app.pending.push({ action: action, payload: payload });
    store.set(LS.pending, app.pending);
    app.online = false;
    setSync('error');
    toast('연결이 잠깐 끊겼어요. 이 기기에 저장했고, 연결되면 자동으로 올려요.');
    return false;
  }
}

function setSync(state) {
  const pill = document.getElementById('syncPill');
  const txt = document.getElementById('syncText');
  if (!pill || !txt) return;
  pill.classList.remove('online', 'offline', 'error');
  if (!app.api) {
    txt.textContent = '이 기기에 저장 중 · 실시간 연결 전';
    pill.classList.add('offline');
  } else if (state === 'online') {
    txt.textContent = '실시간 연결됨 · ' + (app.pending.length ? app.pending.length + '건 올리는 중' : '방금 동기화');
    pill.classList.add('online');
  } else if (state === 'error') {
    txt.textContent = '연결이 끊겨 이 기기에 저장 중';
    pill.classList.add('error');
  } else {
    txt.textContent = '연결 확인 중…';
    pill.classList.add('offline');
  }
}

/* ---------- 공통 UI ---------- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3000);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function timeAgo(v) {
  const t = new Date(v).getTime();
  if (!t || isNaN(t)) return '';
  const diff = now() - t;
  if (diff < 60e3) return '방금 전';
  if (diff < 3600e3) return Math.floor(diff / 60e3) + '분 전';
  if (diff < 86400e3) return Math.floor(diff / 3600e3) + '시간 전';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (sameYear ? '' : d.getFullYear() + '. ') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}

/* ---------- 탭 ---------- */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(function (t) {
    const on = t.dataset.tab === name;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.panel').forEach(function (p) {
    p.classList.toggle('is-active', p.id === 'panel-' + name);
  });
  if (name === 'family') renderFamily();
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
}

/* ---------- 쪽지 ---------- */
function renderAuthors() {
  document.querySelectorAll('.author').forEach(function (b) {
    const on = b.dataset.author === app.author;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function renderNotes() {
  const list = document.getElementById('notesList');
  if (!list) return;
  const items = app.data.messages.slice().sort(function (a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  if (!items.length) {
    list.innerHTML = '<div class="empty">아직 쪽지가 없어요.<br>첫 번째 응원 한마디를 남겨 볼까요? 💌</div>';
    renderCork([]);
    return;
  }
  list.innerHTML = items.map(function (m, i) {
    const a = AUTHORS[m.author] || AUTHORS.star;
    const rot = ((i % 5) - 2) * 0.7;
    return '<article class="note p-' + a.cls + '" style="--rot:' + rot + 'deg">' +
      '<div class="n-head"><span class="av">' + a.emoji + '</span>' + esc(a.name) + '</div>' +
      '<div class="n-text">' + esc(m.text) + '</div>' +
      '<div class="n-foot"><span>' + timeAgo(m.createdAt) + '</span>' +
      '<button class="del" data-del-note="' + esc(m.id) + '" aria-label="쪽지 삭제">✕</button></div>' +
      '</article>';
  }).join('');
  renderCork(items.slice(0, 3));
}

function renderCork(items) {
  const el = document.getElementById('corkPreview');
  if (!el) return;
  el.innerHTML = items.map(function (m) {
    return '<span class="sticky-mini">' + esc(m.text.slice(0, 26)) + '</span>';
  }).join('');
}

/* ---------- 미션 ---------- */
function renderMissions() {
  const list = document.getElementById('missionList');
  if (!list) return;
  const ms = app.data.missions;
  const done = ms.filter(function (m) { return m.done; }).length;
  const total = ms.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  document.getElementById('missionCount').textContent = done + ' / ' + total;
  document.getElementById('progressFill').style.width = pct + '%';
  const praise = document.getElementById('missionPraise');
  if (!total) praise.textContent = '🌱 미션을 추가해 보세요';
  else if (done === 0) praise.textContent = '🌱 시작해 볼까요?';
  else if (done < total) praise.textContent = '🔥 ' + (total - done) + '개 남았어요!';
  else praise.textContent = '🎉 오늘 미션 완성! 최고예요';

  if (!ms.length) {
    list.innerHTML = '<li class="empty">오늘의 미션을 하나 추가해 보세요 ⭐</li>';
  } else {
    list.innerHTML = ms.map(function (m) {
      const who = m.doneBy && AUTHORS[m.doneBy] ? AUTHORS[m.doneBy].name : '';
      return '<li class="mission' + (m.done ? ' done' : '') + '">' +
        '<button class="check" data-toggle="' + esc(m.id) + '" aria-pressed="' + (m.done ? 'true' : 'false') + '" aria-label="' + esc(m.text) + ' 완료 표시">' + (m.done ? '★' : '☆') + '</button>' +
        '<span class="mtext">' + esc(m.text) + '</span>' +
        (who ? '<span class="who">' + esc(who) + '</span>' : '') +
        '<button class="del" data-del-mission="' + esc(m.id) + '" aria-label="미션 삭제">✕</button>' +
        '</li>';
    }).join('');
  }
  renderChalk(ms);
}

function renderChalk(ms) {
  const el = document.getElementById('chalkPreview');
  if (!el) return;
  if (!ms.length) {
    el.innerHTML = '<span class="chalk-line"><i class="cbox"></i>미션을 정해 볼까요</span>';
    return;
  }
  el.innerHTML = ms.slice(0, 4).map(function (m) {
    return '<span class="chalk-line' + (m.done ? ' done' : '') + '"><i class="cbox">' + (m.done ? '✓' : '') + '</i>' + esc(m.text) + '</span>';
  }).join('');
}

function burstStars(x, y, n) {
  const chars = ['⭐', '✨', '💛', '🌟'];
  for (let i = 0; i < (n || 8); i++) {
    const s = document.createElement('span');
    s.className = 'star-fly';
    s.textContent = chars[i % chars.length];
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.setProperty('--dx', (Math.random() * 120 - 60).toFixed(0) + 'px');
    s.style.animationDelay = (Math.random() * 0.2).toFixed(2) + 's';
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1500);
  }
}

/* ---------- 상태 ---------- */
function renderStatuses() {
  ['chacha', 'sundungi'].forEach(function (w) {
    const s = app.data.status[w] || { status: 'work' };
    const meta = STATUSES[s.status] || STATUSES.work;
    document.querySelectorAll('[data-set-status="' + w + '"]').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.status === s.status);
    });
    const badge = document.querySelector('.pstatus[data-status-for="' + w + '"]');
    if (badge) badge.textContent = meta.emoji + ' ' + meta.label;
  });
}

/* ---------- 캐릭터 ---------- */
const bubbleTimers = {};
function say(who, text) {
  const b = document.getElementById('bubble-' + who);
  const actor = document.getElementById('actor-' + who);
  if (!b) return;
  b.textContent = text;
  b.className = 'bubble show ' + (who === 'chacha' ? 'b1' : 'b2');
  if (actor) {
    actor.classList.add('talking');
    setTimeout(function () { actor.classList.remove('talking'); }, 950);
  }
  clearTimeout(bubbleTimers[who]);
  bubbleTimers[who] = setTimeout(function () { b.classList.remove('show'); }, 4200);
}

function randomLine(who) {
  const st = (app.data.status[who] || {}).status || 'work';
  const pool = (LINES[who] && LINES[who][st]) || LINES.chacha.work;
  return pool[Math.floor(Math.random() * pool.length)];
}

function roam(who) {
  const actor = document.getElementById('actor-' + who);
  if (!actor || actor.classList.contains('talking')) return;
  const other = document.getElementById('actor-' + (who === 'chacha' ? 'sundungi' : 'chacha'));
  let x, y, tries = 0;
  do {
    x = 16 + Math.random() * 68;
    y = 74 + Math.random() * 8;
    tries++;
  } while (other && tries < 8 && Math.abs(parseFloat(other.style.getPropertyValue('--x')) - x) < 14);
  actor.style.setProperty('--x', x.toFixed(1));
  actor.style.setProperty('--y', y.toFixed(1));
  actor.classList.add('walking');
  setTimeout(function () { actor.classList.remove('walking'); }, 3400);
}

/* ---------- 가족 코너 / PIN ---------- */
let pad = { mode: 'unlock', buf: '', first: '', after: null };

function getPin() { return store.raw(LS.pin, ''); }

function renderFamily() {
  const remote = !!app.api;
  const unlocked = remote ? !!app.pin : sessionStorage.getItem(LS.unlocked) === '1';
  const content = document.getElementById('familyContent');
  const gateBox = document.getElementById('familyGate');
  if (!content || !gateBox) return;
  content.hidden = !unlocked;
  gateBox.hidden = unlocked;
  document.querySelectorAll('.local-only').forEach(function (e) { e.hidden = remote; });
  document.querySelectorAll('.remote-only').forEach(function (e) { e.hidden = !remote; });
  const idea = document.getElementById('ideaText');
  if (idea) idea.textContent = store.raw(LS.idea, '비밀의 문 너머에는 어떤 방이 있을까요?');
}

/* ---------- 가족 PIN 잠금 (실시간 연결 모드) ---------- */
const gateState = { buf: '' };

function lockApp(msg) {
  app.pin = '';
  app.online = false;
  writeSession('');
  stopPolling();
  gateState.buf = '';
  const g = document.getElementById('gate');
  if (g) g.hidden = false;
  gateDots(0);
  const m = document.getElementById('gateMsg');
  if (m) { m.textContent = msg || ''; m.classList.remove('ok'); }
  setSync('offline');
  const t = document.getElementById('syncText');
  if (t) t.textContent = '잠김 · 가족 PIN 필요';
}

function hideGate() {
  const g = document.getElementById('gate');
  if (g) g.hidden = true;
}

function writeSession(v) {
  try { if (v) sessionStorage.setItem(LS.pinSession, v); else sessionStorage.removeItem(LS.pinSession); } catch (e) {}
}

function gateDots(n) {
  const box = document.getElementById('gateDots');
  if (!box) return;
  const need = Math.max(4, n);
  while (box.children.length < need) box.appendChild(document.createElement('i'));
  Array.prototype.forEach.call(box.children, function (d, i) { d.classList.toggle('on', i < n); });
}

function gateMsg(text, ok) {
  const m = document.getElementById('gateMsg');
  if (!m) return;
  m.textContent = text || '';
  m.classList.toggle('ok', !!ok);
}

function gateInput(key) {
  if (key === 'back') gateState.buf = gateState.buf.slice(0, -1);
  else if (key === 'clear') gateState.buf = '';
  else if (/^[0-9]$/.test(key) && gateState.buf.length < 8) gateState.buf += key;
  gateDots(gateState.buf.length);
  if (gateState.buf.length) gateMsg('');
}

async function submitGate() {
  const pin = gateState.buf.trim();
  if (!pin) { gateMsg('PIN을 입력해 주세요.'); return; }
  const btn = document.getElementById('gateOk');
  if (btn) btn.disabled = true;
  gateMsg('확인 중…');
  app.pin = pin;
  try {
    const data = await apiCall('read');
    app.data = normalize(data);
    saveLocal();
    renderAll();
    writeSession(pin);
    hideGate();
    app.online = true;
    app.lastSync = now();
    setSync('online');
    startPolling();
    toast('비서실이 열렸어요 ✨');
  } catch (e) {
    app.pin = '';
    gateState.buf = '';
    gateDots(0);
    if (e && e.message === 'invalid_pin') gateMsg('PIN이 맞지 않아요. 다시 입력해 주세요.');
    else gateMsg('연결하지 못했어요 (' + ((e && e.message) || '오류') + ')');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function showPad(which, on) {
  const el = document.getElementById(which);
  if (el) el.hidden = !on;
}

function setDots(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelectorAll('i').forEach(function (d, i) { d.classList.toggle('on', i < n); });
}

function openPad(mode, after) {
  pad = { mode: mode, buf: '', first: '', after: after || null };
  const pin = getPin();
  if (mode === 'unlock' && !pin) { pad.mode = 'create'; }
  const isCreate = pad.mode === 'create';
  showPad('pinPad', !isCreate);
  showPad('pinCreate', isCreate);
  setDots('pinDots', 0);
  setDots('pinCreateDots', 0);
  const msg = document.getElementById('pinMsg');
  if (msg) msg.textContent = '';
  const cmsg = document.getElementById('pinCreateMsg');
  if (cmsg) cmsg.textContent = '';
  document.getElementById('pinCreateTitle').textContent = '우리 가족 PIN을 정해 주세요';
  document.getElementById('pinCreateHint').textContent = '4자리 숫자를 두 번 입력하면 돼요.';
}

function closePads() { showPad('pinPad', false); showPad('pinCreate', false); }

function padInput(key) {
  if (key === 'back') pad.buf = pad.buf.slice(0, -1);
  else if (key === 'clear') pad.buf = '';
  else if (/^[0-9]$/.test(key) && pad.buf.length < 4) pad.buf += key;

  if (pad.mode === 'unlock') {
    setDots('pinDots', pad.buf.length);
    if (pad.buf.length === 4) {
      const pin = getPin();
      if (pad.buf === pin) {
        sessionStorage.setItem(LS.unlocked, '1');
        const msg = document.getElementById('pinMsg');
        if (msg) { msg.textContent = '문이 열렸어요!'; msg.classList.add('ok'); }
        setTimeout(function () {
          closePads();
          renderFamily();
          if (pad.after) { const f = pad.after; pad.after = null; f(); }
        }, 420);
      } else {
        const msg = document.getElementById('pinMsg');
        if (msg) { msg.textContent = 'PIN이 맞지 않아요. 다시 눌러 주세요.'; msg.classList.remove('ok'); }
        pad.buf = '';
        setTimeout(function () { setDots('pinDots', 0); }, 260);
      }
    }
  } else {
    setDots('pinCreateDots', pad.buf.length);
    if (pad.buf.length === 4) {
      if (!pad.first) {
        pad.first = pad.buf;
        pad.buf = '';
        document.getElementById('pinCreateTitle').textContent = '한 번 더 눌러 주세요';
        document.getElementById('pinCreateHint').textContent = '확인을 위해 같은 숫자를 다시 입력해요.';
        setDots('pinCreateDots', 0);
      } else {
        if (pad.buf === pad.first) {
          store.rawSet(LS.pin, pad.buf);
          sessionStorage.setItem(LS.unlocked, '1');
          const cmsg = document.getElementById('pinCreateMsg');
          if (cmsg) { cmsg.textContent = '가족 PIN을 저장했어요!'; cmsg.classList.add('ok'); }
          setTimeout(function () {
            closePads();
            renderFamily();
            toast('가족 PIN을 정했어요 🔑');
          }, 420);
        } else {
          const cmsg = document.getElementById('pinCreateMsg');
          if (cmsg) { cmsg.textContent = '두 번의 숫자가 달라요. 처음부터 다시 눌러 주세요.'; cmsg.classList.remove('ok'); }
          pad.first = '';
          pad.buf = '';
          setDots('pinCreateDots', 0);
          document.getElementById('pinCreateTitle').textContent = '우리 가족 PIN을 정해 주세요';
          document.getElementById('pinCreateHint').textContent = '4자리 숫자를 두 번 입력하면 돼요.';
        }
      }
    }
  }
}

/* ---------- 렌더 전체 ---------- */
function renderAll() {
  renderNotes();
  renderMissions();
  renderStatuses();
  renderFamily();
}

/* ---------- 이벤트 ---------- */
function bind() {
  // 탭
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchTab(t.dataset.tab); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.dataset.goto); });
  });

  // 쪽지 작성자
  document.querySelectorAll('.author').forEach(function (b) {
    b.addEventListener('click', function () {
      app.author = b.dataset.author;
      renderAuthors();
    });
  });

  // 쪽지 글자수
  const ta = document.getElementById('noteText');
  const counter = document.getElementById('noteCounter');
  ta.addEventListener('input', function () {
    counter.textContent = ta.value.length + ' / 140';
  });

  document.getElementById('btnAddNote').addEventListener('click', async function () {
    const text = ta.value.trim();
    if (!text) { toast('응원 한마디를 적어 주세요 💌'); ta.focus(); return; }
    const payload = { id: uid(), author: app.author, text: text, createdAt: iso(now()) };
    this.disabled = true;
    await write('addMessage', payload);
    this.disabled = false;
    ta.value = '';
    counter.textContent = '0 / 140';
    toast('쪽지를 붙였어요 💌');
  });

  // 쪽지 삭제
  document.getElementById('notesList').addEventListener('click', function (e) {
    const b = e.target.closest('[data-del-note]');
    if (!b) return;
    write('deleteMessage', { id: b.dataset.delNote });
    toast('쪽지를 지웠어요');
  });

  // 미션 추가
  document.getElementById('missionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('missionText');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    write('addMission', { id: uid(), text: text, createdAt: iso(now()) });
    input.value = '';
    toast('미션을 추가했어요 ⭐');
  });

  // 미션 토글 / 삭제
  document.getElementById('missionList').addEventListener('click', function (e) {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const id = t.dataset.toggle;
      const m = app.data.missions.find(function (x) { return x.id === id; });
      if (!m) return;
      const nextDone = !m.done;
      const box = t.getBoundingClientRect();
      write('toggleMission', { id: id, done: nextDone, by: app.author, at: iso(now()) });
      if (nextDone) {
        burstStars(box.left + box.width / 2, box.top + box.height / 2, 9);
        toast(DEFAULT_PRAISE[Math.floor(Math.random() * DEFAULT_PRAISE.length)]);
      }
      return;
    }
    const d = e.target.closest('[data-del-mission]');
    if (d) { write('deleteMission', { id: d.dataset.delMission }); toast('미션을 지웠어요'); }
  });

  // 상태 변경
  document.querySelectorAll('[data-set-status]').forEach(function (b) {
    b.addEventListener('click', function () {
      const who = b.dataset.setStatus;
      const st = b.dataset.status;
      write('setStatus', { who: who, status: st });
      const meta = STATUSES[st];
      say(who, '이제 ' + meta.emoji + ' ' + meta.label + (st === 'work' ? '! 같이 힘내요' : ' 할게요'));
    });
  });

  // 캐릭터 클릭
  ['chacha', 'sundungi'].forEach(function (who) {
    const el = document.getElementById('actor-' + who);
    el.addEventListener('click', function (e) {
      if (e.target.closest('.pstatus')) return;
      say(who, randomLine(who));
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say(who, randomLine(who)); }
    });
  });

  // 캐릭터 이름표 상태 → 상태 카드로
  document.querySelectorAll('.pstatus').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      const who = b.dataset.statusFor;
      const card = document.querySelector('.status-card[data-card="' + who + '"]');
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      say(who, '아래에서 제 상태를 바꿀 수 있어요!');
    });
  });

  // 책상 / 독서 코너
  document.querySelectorAll('[data-desk]').forEach(function (b) {
    b.addEventListener('click', function () {
      const who = b.dataset.desk;
      const st = who === 'chacha' ? 'work' : 'read';
      write('setStatus', { who: who, status: st });
      say(who, who === 'chacha' ? '책상에 앉았어요! 열일 시작 💻' : '독서 코너가 제일 좋아요 📚');
    });
  });

  // 가족 코너
  document.getElementById('btnUnlock').addEventListener('click', function () { openPad('unlock'); });
  document.getElementById('btnLock').addEventListener('click', function () {
    if (app.api) { lockApp(); toast('비서실을 잠갔어요 🔒'); return; }
    sessionStorage.removeItem(LS.unlocked);
    renderFamily();
    toast('다시 잠갔어요 🔒');
  });
  document.getElementById('btnPinCancel').addEventListener('click', closePads);
  document.getElementById('btnCreateCancel').addEventListener('click', closePads);
  document.getElementById('pinPad').addEventListener('click', function (e) { if (e.target === this) closePads(); });
  document.getElementById('pinCreate').addEventListener('click', function (e) { if (e.target === this) closePads(); });

  document.getElementById('keypad').addEventListener('click', function (e) {
    const b = e.target.closest('[data-key]'); if (b) padInput(b.dataset.key);
  });
  document.getElementById('pinCreateKeys').addEventListener('click', function (e) {
    const b = e.target.closest('[data-key]'); if (b) padInput(b.dataset.key);
  });

  document.getElementById('btnChangePin').addEventListener('click', function () {
    openPad('unlock', function () { openPad('create'); });
  });
  document.getElementById('btnResetPin').addEventListener('click', function () {
    openPad('create');
  });
  document.getElementById('btnPinChange2').addEventListener('click', function () {
    closeSettings();
    if (app.api) { toast('PIN은 Apps Script의 FAMILY_PIN에서 바꿔요'); return; }
    openPad('unlock', function () { openPad('create'); });
  });
  document.getElementById('btnPinReset2').addEventListener('click', function () {
    closeSettings();
    if (app.api) { toast('PIN은 Apps Script의 FAMILY_PIN에서 바꿔요'); return; }
    openPad('create');
  });

  // 가족 PIN 잠금 화면
  const gateKeys = document.getElementById('gateKeys');
  if (gateKeys) {
    gateKeys.addEventListener('click', function (e) {
      const b = e.target.closest('[data-gate]');
      if (b) gateInput(b.dataset.gate);
    });
  }
  const gateOk = document.getElementById('gateOk');
  if (gateOk) gateOk.addEventListener('click', submitGate);
  const gateSettingsBtn = document.getElementById('gateSettings');
  if (gateSettingsBtn) gateSettingsBtn.addEventListener('click', openSettings);
  document.addEventListener('keydown', function (e) {
    const g = document.getElementById('gate');
    if (!g || g.hidden) return;
    if (/^[0-9]$/.test(e.key)) { gateInput(e.key); }
    else if (e.key === 'Backspace') { gateInput('back'); }
    else if (e.key === 'Enter') { submitGate(); }
  });

  // 아이디어
  document.getElementById('ideaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('ideaInput');
    const v = input.value.trim();
    if (!v) return;
    store.rawSet(LS.idea, v);
    document.getElementById('ideaText').textContent = v;
    input.value = '';
    toast('다음 장면을 담아 뒀어요 🎬');
  });

  // 설정
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
  document.getElementById('btnCloseSettings2').addEventListener('click', closeSettings);
  document.getElementById('settingsModal').addEventListener('click', function (e) {
    if (e.target === this) closeSettings();
  });
  document.getElementById('btnSaveApi').addEventListener('click', saveApi);
  document.getElementById('btnTestApi').addEventListener('click', testApi);
  document.getElementById('btnClearApi').addEventListener('click', clearApi);
  document.getElementById('btnResetLocal').addEventListener('click', function () {
    const api = store.raw(LS.api, '');
    try {
      Object.keys(LS).forEach(function (k) { if (k !== 'api') localStorage.removeItem(LS[k]); });
    } catch (e) {}
    store.rawSet(LS.api, api);
    app.data = defaultData();
    app.pending = [];
    saveLocal();
    renderAll();
    closeSettings();
    toast('이 기기 데이터를 새로 시작했어요');
    if (app.api) refresh(true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSettings(); closePads(); }
  });
}

function openSettings() {
  document.getElementById('apiUrl').value = app.api || '';
  const s = document.getElementById('apiStatus');
  s.textContent = '';
  s.classList.remove('err');
  document.getElementById('settingsModal').hidden = false;
}
function closeSettings() { document.getElementById('settingsModal').hidden = true; }

function normalizeApi(v) {
  let u = (v || '').trim();
  if (!u) return '';
  if (/^script\.google\.com\//.test(u)) u = 'https://' + u;
  if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+$/.test(u)) u += '/exec';
  if (!/^https:\/\//.test(u)) return null;
  return u;
}

async function testApi() {
  const s = document.getElementById('apiStatus');
  const url = normalizeApi(document.getElementById('apiUrl').value);
  if (url === null) { s.textContent = 'https:// 로 시작하는 주소를 넣어 주세요.'; s.classList.add('err'); return; }
  if (!url) { s.textContent = '웹앱 URL을 먼저 넣어 주세요.'; s.classList.add('err'); return; }
  s.classList.remove('err');
  s.textContent = '확인 중…';
  const prev = app.api;
  app.api = url;
  try {
    const d = await apiCall('read');
    const n = normalize(d);
    s.textContent = '연결 성공! 쪽지 ' + n.messages.length + '개 · 미션 ' + n.missions.length + '개를 읽었어요.';
  } catch (e) {
    if (e && e.message === 'invalid_pin') {
      s.textContent = '연결은 되는데 PIN이 필요한 서버예요. 저장한 뒤 가족 PIN을 입력하면 열려요.';
      s.classList.remove('err');
    } else {
      s.textContent = '연결하지 못했어요 (' + (e.message || '오류') + '). 배포 권한이 "모든 사용자"인지 확인해 주세요.';
      s.classList.add('err');
    }
  } finally {
    app.api = prev;
  }
}

function saveApi() {
  const s = document.getElementById('apiStatus');
  const url = normalizeApi(document.getElementById('apiUrl').value);
  if (url === null) { s.textContent = 'https:// 로 시작하는 주소를 넣어 주세요.'; s.classList.add('err'); return; }
  if (!url) { clearApi(); return; }
  app.api = url;
  store.rawSet(LS.api, url);
  app.pin = '';
  writeSession('');
  stopPolling();
  closeSettings();
  setSync('');
  lockApp('가족 PIN을 넣으면 우리 비서실과 연결돼요.');
}

function clearApi() {
  app.api = '';
  app.pin = '';
  writeSession('');
  store.del(LS.api);
  stopPolling();
  hideGate();
  setSync('offline');
  renderAll();
  document.getElementById('apiUrl').value = '';
  const s = document.getElementById('apiStatus');
  s.classList.remove('err');
  s.textContent = '실시간 연결을 해제했어요. 이 기기에만 저장돼요.';
}

/* ---------- 폴링 ---------- */
let pollTimer = null;
function startPolling() {
  stopPolling();
  if (!app.api) return;
  pollTimer = setInterval(function () {
    if (document.hidden) return;
    refresh(true);
  }, 5000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

/* ---------- 시작 ---------- */
function boot() {
  app.api = store.raw(LS.api, '') || '';
  const saved = store.get(LS.data, null);
  const pending = store.get(LS.pending, []);
  app.pending = Array.isArray(pending) ? pending : [];
  app.data = normalize(saved || defaultData());
  saveLocal();

  bind();
  renderAuthors();
  renderAll();
  setSync('');

  const hash = (location.hash || '').replace('#', '');
  if (['room', 'notes', 'missions', 'family'].indexOf(hash) >= 0) switchTab(hash);

  if (app.api) {
    app.pin = (function () { try { return sessionStorage.getItem(LS.pinSession) || ''; } catch (e) { return ''; } })();
    if (app.pin) { startPolling(); refresh(true); }
    else { lockApp(''); }
  }

  // 캐릭터가 심심하면 돌아다녀요
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    setInterval(function () { roam('chacha'); }, 8200);
    setInterval(function () { roam('sundungi'); }, 9600);
    setTimeout(function () {
      say('chacha', '어서 오세요, 사장님! 💗');
    }, 1400);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && app.api) refresh(true);
  });
}

document.addEventListener('DOMContentLoaded', boot);

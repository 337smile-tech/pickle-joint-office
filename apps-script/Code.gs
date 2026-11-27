/**
 * 차차 × 순둥이 합동 비서실 — Google Sheets JSON API
 * ------------------------------------------------------------
 * 쓰는 방법 (약 1분)
 * 1. 구글 시트 `차차-순둥이-합동비서실-DB`를 엽니다.
 * 2. 메뉴 [확장 프로그램] → [Apps Script] 를 누릅니다.
 * 3. 기존 코드를 모두 지우고 이 파일 내용을 그대로 붙여 넣고 저장(Ctrl+S)합니다.
 * 4. 오른쪽 위 [배포] → [새 배포] → 유형 [웹 앱]
 *    - 설명: 합동비서실 API
 *    - 다음 사용자로 실행: 나
 *    - 액세스 권한: 모든 사용자
 *    → [배포] → 권한 승인 → 나온 "웹 앱 URL"(…/exec)을 복사합니다.
 * 5. 비서실 페이지 오른쪽 위 ⚙️ → 실시간 연결에 붙여 넣고 [저장].
 *
 * · 시트에 붙여 만든 스크립트라면 SPREADSHEET_ID 는 비워 두세요.
 *   다른 곳에서 만든 독립 스크립트라면 시트 주소의 /d/.../ 부분을 넣으세요.
 * · API 는 GET/POST 둘 다 지원합니다.
 *   GET  : ?action=read                                  → 전체 데이터
 *          ?action=addMessage&payload={"author":"star","text":"..."}
 *          ?action=addMission&payload={"text":"..."}
 *          ?action=toggleMission&payload={"id":"...","done":true,"by":"star"}
 *          ?action=deleteMission&payload={"id":"..."}
 *          ?action=setStatus&payload={"who":"chacha","status":"read"}
 *          ?action=ping
 *   POST : 본문에 {"action":"...", "payload":{...}} 를 담아 같은 동작.
 * · 앱은 CORS 리다이렉트 문제를 피하려고 GET 으로 쓰기를 보냅니다.
 *   서버는 두 방식 모두 같은 함수로 처리합니다.
 */

var CONFIG = {
  // 시트에 붙여 만든 스크립트면 '' 로 두세요.
  SPREADSHEET_ID: '',

  // 이 값을 채우면 요청에 ?key=... 가 있어야만 동작합니다. (선택)
  SHARED_KEY: '',

  // 처음 만들 때 기본 미션을 넣을지
  SEED_DEFAULT_MISSIONS: true
};

var HEADERS = {
  messages: ['id', 'author', 'text', 'createdAt'],
  missions: ['id', 'text', 'done', 'doneBy', 'doneAt', 'createdAt'],
  status: ['id', 'who', 'status', 'updatedAt']
};

var DEFAULT_MISSIONS = ['책 읽기 20분', '디지털 디톡스 1시간', '물 3잔 마시기'];
var AUTHORS = ['star', 'sundungi', 'chacha', 'sundungi_pickle'];
var STATUS_VALUES = ['work', 'read', 'rest', 'play'];
var WHOS = ['chacha', 'sundungi'];

/* ============================ 시트 ============================ */

function getSS_() {
  if (CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('SPREADSHEET_ID가 비어 있고 시트에 붙은 스크립트도 아닙니다.');
  return ss;
}

function getSheet_(name) {
  var ss = getSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var head = HEADERS[name];
  var current = sh.getRange(1, 1, 1, head.length).getValues()[0];
  var ok = true;
  for (var i = 0; i < head.length; i++) {
    if (String(current[i]).trim() !== head[i]) { ok = false; break; }
  }
  if (!ok) {
    sh.getRange(1, 1, 1, head.length).setValues([head]);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#FFF0F6');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readRows_(name) {
  var sh = getSheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, HEADERS[name].length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (String(row[0]).trim() === '') continue;
    var o = {};
    for (var c = 0; c < HEADERS[name].length; c++) o[HEADERS[name][c]] = row[c];
    out.push(o);
  }
  return out;
}

function toIso_(v) {
  if (v === '' || v === null || typeof v === 'undefined') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return v.toISOString();
  return String(v);
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var target = String(id);
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === target) return i + 2;
  }
  return 0;
}

/* ============================ 읽기 ============================ */

function readAll_() {
  var messages = readRows_('messages').map(function (r) {
    return {
      id: String(r.id),
      author: String(r.author || 'star'),
      text: String(r.text || ''),
      createdAt: toIso_(r.createdAt)
    };
  }).filter(function (m) { return m.text !== ''; });

  var missions = readRows_('missions').map(function (r) {
    return {
      id: String(r.id),
      text: String(r.text || ''),
      done: r.done === true || String(r.done).toUpperCase() === 'TRUE',
      doneBy: String(r.doneBy || ''),
      doneAt: toIso_(r.doneAt),
      createdAt: toIso_(r.createdAt)
    };
  }).filter(function (m) { return m.text !== ''; });

  var status = {};
  readRows_('status').forEach(function (r) {
    var who = String(r.who || '');
    if (WHOS.indexOf(who) < 0) return;
    status[who] = { status: String(r.status || 'work'), updatedAt: toIso_(r.updatedAt) };
  });
  WHOS.forEach(function (who) {
    if (!status[who]) status[who] = { status: who === 'chacha' ? 'work' : 'play', updatedAt: new Date().toISOString() };
  });

  return { messages: messages, missions: missions, status: status, serverTime: new Date().toISOString() };
}

/* ============================ 쓰기 ============================ */

function handleAction_(action, p) {
  p = p || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (action === 'addMessage') addMessage_(p);
    else if (action === 'deleteMessage') deleteMessage_(p);
    else if (action === 'addMission') addMission_(p);
    else if (action === 'toggleMission') toggleMission_(p);
    else if (action === 'deleteMission') deleteMission_(p);
    else if (action === 'setStatus') setStatus_(p);
    else if (action === 'seed') seed_();
    else if (action === 'ping') { /* 읽기만 */ }
    else throw new Error('알 수 없는 action: ' + action);
  } finally {
    lock.releaseLock();
  }
  return readAll_();
}

function clean_(s, max) {
  return String(s === null || typeof s === 'undefined' ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max || 200);
}

function addMessage_(p) {
  var text = clean_(p.text, 300);
  if (!text) throw new Error('쪽지 내용이 비어 있어요.');
  var author = AUTHORS.indexOf(String(p.author)) >= 0 ? String(p.author) : 'star';
  var id = clean_(p.id, 40) || 'm' + Date.now();
  var sh = getSheet_('messages');
  if (findRow_(sh, id)) return;
  sh.appendRow([id, author, text, clean_(p.createdAt, 40) || new Date().toISOString()]);
}

function deleteMessage_(p) {
  var sh = getSheet_('messages');
  var row = findRow_(sh, p.id);
  if (row) sh.deleteRow(row);
}

function addMission_(p) {
  var text = clean_(p.text, 120);
  if (!text) throw new Error('미션 내용이 비어 있어요.');
  var id = clean_(p.id, 40) || 's' + Date.now();
  var sh = getSheet_('missions');
  if (findRow_(sh, id)) return;
  sh.appendRow([id, text, false, '', '', clean_(p.createdAt, 40) || new Date().toISOString()]);
}

function toggleMission_(p) {
  var sh = getSheet_('missions');
  var row = findRow_(sh, p.id);
  if (!row) throw new Error('미션을 찾지 못했어요.');
  var done = p.done === true || String(p.done).toUpperCase() === 'TRUE';
  sh.getRange(row, 3, 1, 3).setValues([[
    done,
    done ? clean_(p.by, 40) : '',
    done ? (clean_(p.at, 40) || new Date().toISOString()) : ''
  ]]);
}

function deleteMission_(p) {
  var sh = getSheet_('missions');
  var row = findRow_(sh, p.id);
  if (row) sh.deleteRow(row);
}

function setStatus_(p) {
  var who = String(p.who);
  var status = String(p.status);
  if (WHOS.indexOf(who) < 0) throw new Error('알 수 없는 캐릭터: ' + who);
  if (STATUS_VALUES.indexOf(status) < 0) throw new Error('알 수 없는 상태: ' + status);
  var sh = getSheet_('status');
  var row = findRow_(sh, who);
  var at = new Date().toISOString();
  if (row) sh.getRange(row, 2, 1, 3).setValues([[who, status, at]]);
  else sh.appendRow([who, who, status, at]);
}

/* ============================ 기본값 ============================ */

function seed_() {
  var nowIso = new Date().toISOString();
  var ms = getSheet_('missions');
  if (CONFIG.SEED_DEFAULT_MISSIONS && ms.getLastRow() < 2) {
    DEFAULT_MISSIONS.forEach(function (t, i) {
      ms.appendRow(['seed-' + (i + 1), t, false, '', '', nowIso]);
    });
  }
  var st = getSheet_('status');
  if (st.getLastRow() < 2) {
    st.appendRow(['chacha', 'chacha', 'work', nowIso]);
    st.appendRow(['sundungi', 'sundungi', 'play', nowIso]);
  }
  var mg = getSheet_('messages');
  if (mg.getLastRow() < 2) {
    mg.appendRow(['seed-1', 'chacha', '비서실 개업! 오늘도 같이 힘내요, 사장님 🌸', nowIso]);
  }
}

/** 시트 편집기에서 한 번 실행하면 탭과 기본값을 만들어 줍니다. */
function setup() {
  ['messages', 'missions', 'status'].forEach(getSheet_);
  seed_();
  return '준비 완료: messages / missions / status';
}

/* ============================ HTTP ============================ */

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkKey_(p) {
  if (CONFIG.SHARED_KEY && String(p.key || '') !== CONFIG.SHARED_KEY) {
    throw new Error('key가 필요합니다.');
  }
}

function parsePayload_(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function route_(action, payload, key) {
  try {
    checkKey_({ key: key });
    if (!action || action === 'read') return json_({ ok: true, data: readAll_() });
    return json_({ ok: true, data: handleAction_(action, payload) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  return route_(p.action || 'read', parsePayload_(p.payload), p.key);
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  var p = (e && e.parameter) || {};
  var action = body.action || p.action || 'read';
  var payload = body.payload || parsePayload_(p.payload);
  return route_(action, payload, body.key || p.key);
}

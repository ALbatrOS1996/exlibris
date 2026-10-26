/* Rdzeń: stan aplikacji, zapis, okładki, rangi, odznaki, statystyki */
var KEY = 'exlibris.v1';
var S = load();

function blank() {
  return { books: [], settings: { theme: 'dark', dayGoal: 20, yearGoal: 24 }, seenBadges: [], rank: 0 };
}
function load() {
  try {
    var s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.books) { var b = blank(); s.settings = Object.assign(b.settings, s.settings); s.seenBadges = s.seenBadges || []; return s; }
  } catch (e) {}
  return blank();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️', 'Nie udało się zapisać', 'Pamięć przeglądarki jest pełna – zrób kopię w Trofeach.'); }
}

/* ---------- daty ---------- */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return iso(new Date()); }
function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(s, n) { var d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); }
var MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
var MONTHS_G = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
var MONTHS_LOC = ['styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'];
var MON3 =['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
function niceDate(s) { if (!s) return ''; var d = parseIso(s); return d.getDate() + ' ' + MONTHS_G[d.getMonth()] + ' ' + d.getFullYear(); }
function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return n === 1 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? b : c; }
function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

/* ---------- książki ---------- */
function uid() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function book(id) { for (var i = 0; i < S.books.length; i++) if (S.books[i].id === id) return S.books[i]; return null; }
function newBook(o) {
  var b = Object.assign({ id: uid(), title: '', author: '', year: '', pages: 0, cur: 0, status: 'reading', start: today(), end: '',
    cover: '', isbn: '', rating: 0, notes: '', src: null, log: [], added: today() }, o);
  if (b.status === 'done') { b.cur = b.pages; b.end = b.end || today(); }
  S.books.unshift(b); save();
  return b;
}
function pct(b) { return b.pages ? Math.min(100, Math.round(b.cur / b.pages * 100)) : 0; }
function byStatus(st) { return S.books.filter(function (b) { return b.status === st; }); }
function finished() {
  return byStatus('done').filter(function (b) { return b.end; }).sort(function (a, b) { return a.end < b.end ? 1 : -1; });
}
function srcBook(list, key) {
  for (var i = 0; i < S.books.length; i++) { var s = S.books[i].src; if (s && s.list === list && s.key === key) return S.books[i]; }
  return null;
}

/* zapis postępu – zwraca, co się wydarzyło, żeby UI mogło świętować */
function setProgress(b, page) {
  page = Math.max(0, Math.min(b.pages || page, Math.round(page)));
  var delta = page - b.cur;
  if (!delta) return { delta: 0 };
  var before = pct(b), dayBefore = pagesOn(today());
  b.cur = page;
  var d = today(), last = b.log[b.log.length - 1];
  if (last && last.d === d) { last.p += delta; if (!last.p) b.log.pop(); } else b.log.push({ d: d, p: delta });
  if (b.status === 'want') { b.status = 'reading'; b.start = d; }
  var res = { delta: delta, before: before, after: pct(b), dayBefore: dayBefore, dayAfter: pagesOn(d) };
  if (b.pages && page >= b.pages && b.status !== 'done') { b.status = 'done'; b.end = d; res.finished = true; }
  else if (b.status === 'done' && page < b.pages) { b.status = 'reading'; b.end = ''; }
  save();
  return res;
}
function finishBook(b, date) {
  if (b.pages && b.cur < b.pages) {
    var d = date || today(), delta = b.pages - b.cur, last = b.log[b.log.length - 1];
    if (last && last.d === d) last.p += delta; else b.log.push({ d: d, p: delta });
    b.cur = b.pages;
  }
  b.status = 'done'; b.end = date || today(); if (!b.start) b.start = b.end;
  save();
}

/* ---------- dzienniki stron ---------- */
function dayMap() {
  var m = {};
  S.books.forEach(function (b) { b.log.forEach(function (l) { m[l.d] = (m[l.d] || 0) + l.p; }); });
  return m;
}
function pagesOn(d) { return dayMap()[d] || 0; }
function streak() {
  var m = dayMap(), d = today(), n = 0;
  if (!(m[d] > 0)) d = addDays(d, -1); // dzisiaj jeszcze można dociągnąć serię
  while (m[d] > 0) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak() {
  var m = dayMap(), days = Object.keys(m).filter(function (k) { return m[k] > 0; }).sort(), best = 0, run = 0, prev = null;
  days.forEach(function (d) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; });
  return best;
}
function pagesInRange(from, to) {
  var m = dayMap(), s = 0;
  for (var k in m) if (k >= from && k <= to) s += m[k];
  return s;
}
function totalPages() { return S.books.reduce(function (s, b) { return s + (b.cur || 0); }, 0); }

/* ---------- rangi (XP liczone z danych, nic nie „ginie”) ---------- */
var RANKS = [
  [0, 'Uczeń skryptorium', 'Pierwsze litery na woskowej tabliczce.'],
  [400, 'Kopista', 'Przepisujesz pewną ręką.'],
  [1200, 'Skryba', 'Twoje karty idą do opactwa.'],
  [2800, 'Iluminator', 'Złocisz inicjały i marginesy.'],
  [5500, 'Bibliotekarz', 'Klucze do armarium są u ciebie.'],
  [9500, 'Kronikarz', 'Spisujesz dzieje swojego czasu.'],
  [15000, 'Humanista', 'Ad fontes – sięgasz do źródeł.'],
  [23000, 'Erudyta', 'Cytujesz z pamięci w trzech językach.'],
  [34000, 'Encyklopedysta', 'Diderot podpisałby się pod tobą.'],
  [50000, 'Strażnik Aleksandrii', 'Biblioteka przetrwała dzięki tobie.']
];
function xp() {
  var x = totalPages();
  S.books.forEach(function (b) { if (b.status === 'done') x += 60 + (b.src ? 30 : 0); });
  x += earnedBadges().length * 40;
  return x;
}
function rankOf(x) {
  var i = 0; while (i + 1 < RANKS.length && x >= RANKS[i + 1][0]) i++;
  var next = RANKS[i + 1];
  return { i: i, name: RANKS[i][1], desc: RANKS[i][2], from: RANKS[i][0], to: next ? next[0] : null, next: next ? next[1] : null };
}

/* ---------- katalogi ---------- */
var CATS = {
  kanon: { name: 'Kanon Europy', data: KANON, key: function (r, i) { return 'k' + i; },
    title: function (r) { return r[2]; }, author: function (r) { return r[4]; }, year: function (r) { return r[5]; } },
  czarne: { name: 'Czarne', data: CZARNE, key: function (r, i) { return 'c' + i; },
    title: function (r) { return r[3]; }, author: function (r) { return r[2]; }, year: function () { return ''; } }
};
function catStatus(list, i) { var b = srcBook(list, CATS[list].key(null, i)); return b ? b.status : ''; }
function catCount(list, filterFn) {
  var n = 0, d = 0;
  CATS[list].data.forEach(function (r, i) { if (filterFn && !filterFn(r)) return; n++; if (catStatus(list, i) === 'done') d++; });
  return { n: n, done: d };
}
function kanonCountries() {
  var m = {};
  KANON.forEach(function (r, i) { var c = r[1]; m[c] = m[c] || { n: 0, done: 0 }; m[c].n++; if (catStatus('kanon', i) === 'done') m[c].done++; });
  return m;
}

/* ---------- odznaki ---------- */
function BADGES() {
  var done = byStatus('done'), nDone = done.length, tp = totalPages(), st = Math.max(streak(), bestStreak());
  var kDone = done.filter(function (b) { return b.src && b.src.list === 'kanon'; }).length;
  var cDone = done.filter(function (b) { return b.src && b.src.list === 'czarne'; });
  var kc = kanonCountries(), touched = 0, full = 0;
  for (var c in kc) { if (kc[c].done) touched++; if (kc[c].done === kc[c].n) full++; }
  var ser = function (name) { return cDone.filter(function (b) { var r = CZARNE[+b.src.key.slice(1)]; return r && r[4] === name; }).length; };
  var fast = done.some(function (b) { return b.pages >= 250 && b.start && b.end && (parseIso(b.end) - parseIso(b.start)) / 864e5 <= 3; });
  var thick = done.some(function (b) { return b.pages >= 600; });
  var rated = done.filter(function (b) { return b.rating; }).length;
  var pl = KANON.filter(function (r) { return r[1] === 'Polska'; }).length;
  var plDone = KANON.filter(function (r, i) { return r[1] === 'Polska' && catStatus('kanon', i) === 'done'; }).length;
  return [
    ['first-page', '✒️', 'Pierwsza karta', 'Zapisz pierwszy postęp', S.books.some(function (b) { return b.log.length; }) ? 1 : 0, 1, '#a9c4a0'],
    ['finis', '📜', 'Finis', 'Ukończ pierwszą książkę', nDone, 1, '#dcc08a'],
    ['ten', '📚', 'Dziesiątka', 'Ukończ 10 książek', nDone, 10, '#a8bfd1'],
    ['quarter', '🏛️', 'Ćwierćwiecze', 'Ukończ 25 książek', nDone, 25, '#bfb3d4'],
    ['fifty', '🦉', 'Pół setki', 'Ukończ 50 książek', nDone, 50, '#dcaaa2'],
    ['hundred', '👑', 'Centuria', 'Ukończ 100 książek', nDone, 100, '#dcc08a'],
    ['p1000', '📖', 'Tysiąc kart', 'Przeczytaj 1000 stron', tp, 1000, '#a9c4a0'],
    ['p5000', '🗞️', 'Pięć tysięcy', 'Przeczytaj 5000 stron', tp, 5000, '#a8bfd1'],
    ['p20000', '🗿', 'Monument', 'Przeczytaj 20 000 stron', tp, 20000, '#bfb3d4'],
    ['s3', '🕯️', 'Trzy wieczory', 'Seria 3 dni czytania', st, 3, '#dcaaa2'],
    ['s7', '🔥', 'Tydzień przy pulpicie', 'Seria 7 dni', st, 7, '#dcaaa2'],
    ['s30', '⏳', 'Reguła zakonna', 'Seria 30 dni', st, 30, '#dcc08a'],
    ['thick', '🧱', 'Cegła', 'Ukończ książkę ≥ 600 stron', thick ? 1 : 0, 1, '#c9b48a'],
    ['fast', '🐎', 'Jednym tchem', '≥ 250 stron w 3 dni', fast ? 1 : 0, 1, '#a9c4a0'],
    ['critic', '⭐', 'Recenzent', 'Oceń 5 ukończonych', rated, 5, '#dcc08a'],
    ['k1', '🏺', 'Ad fontes', 'Pierwsza z Kanonu', kDone, 1, '#c9b48a'],
    ['k10', '🗺️', 'Grand Tour', 'Kanon: 10 krajów', touched, 10, '#a8bfd1'],
    ['k25', '🧭', 'Obywatel Europy', 'Kanon: 25 krajów', touched, 25, '#bfb3d4'],
    ['kfull', '🏰', 'Znawca narodu', 'Cały kanon jednego kraju', full, 1, '#dcc08a'],
    ['kpl', '🦅', 'Lektury obowiązkowe', 'Cały polski kanon', plDone, pl, '#dcaaa2'],
    ['c1', '🖋️', 'Literatura faktu', 'Pierwszy tytuł Czarnego', cDone.length, 1, '#a9c4a0'],
    ['c10', '📰', 'Reporter', '10 tytułów Czarnego', cDone.length, 10, '#a8bfd1'],
    ['sulina', '⚓', 'Do ujścia Dunaju', '5 książek z serii Sulina', ser('Sulina'), 5, '#bfb3d4'],
    ['rep', '🎙️', 'Szkoła reportażu', '5 z serii Reportaż', ser('Reportaż'), 5, '#dcaaa2']
  ].map(function (a) { return { id: a[0], icon: a[1], name: a[2], desc: a[3], v: a[4], need: a[5], hue: a[6], got: a[4] >= a[5] }; });
}
function earnedBadges() {
  // bez rekurencji przez xp(): BADGES nie korzysta z xp
  return BADGES().filter(function (b) { return b.got; });
}
/* nowe odznaki od ostatniego sprawdzenia */
function newBadges() {
  var got = earnedBadges(), fresh = got.filter(function (b) { return S.seenBadges.indexOf(b.id) < 0; });
  if (fresh.length) { S.seenBadges = got.map(function (b) { return b.id; }); save(); }
  return fresh;
}

/* ---------- okładki w IndexedDB ---------- */
var COVERS = {};
var IDB = null;
function idb() {
  if (IDB) return IDB;
  IDB = new Promise(function (res, rej) {
    if (!window.indexedDB) return rej();
    var r = indexedDB.open('exlibris', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('covers'); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
  return IDB;
}
function loadCovers() {
  return idb().then(function (db) {
    return new Promise(function (res) {
      var tx = db.transaction('covers'), st = tx.objectStore('covers'), q = st.openCursor();
      q.onsuccess = function () { var c = q.result; if (c) { COVERS[c.key] = c.value; c.continue(); } else res(); };
      q.onerror = function () { res(); };
    });
  }).catch(function () {});
}
function putCover(id, dataUrl) {
  COVERS[id] = dataUrl;
  return idb().then(function (db) {
    var tx = db.transaction('covers', 'readwrite');
    if (dataUrl) tx.objectStore('covers').put(dataUrl, id); else tx.objectStore('covers').delete(id);
  }).catch(function () {});
}
function coverSrc(b) { return b.cover === 'idb' ? COVERS[b.id] : b.cover; }

/* zmniejszenie obrazu do ~420 px, JPEG */
function shrinkImage(fileOrBlob) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(fileOrBlob), img = new Image();
    img.onload = function () {
      var k = Math.min(1, 420 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', .84));
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(); };
    img.src = url;
  });
}

/* ---------- kopia zapasowa ---------- */
function exportData() {
  var d = { app: 'exlibris', v: 1, date: new Date().toISOString(), state: S, covers: COVERS };
  var blob = new Blob([JSON.stringify(d)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'ex-libris-kopia-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}
function importData(text) {
  var d = JSON.parse(text);
  if (!d || d.app !== 'exlibris' || !d.state || !d.state.books) throw new Error('To nie jest kopia Ex Libris.');
  var b = blank(); S = d.state; S.settings = Object.assign(b.settings, S.settings); S.seenBadges = S.seenBadges || [];
  save();
  var c = d.covers || {};
  return Promise.all(Object.keys(c).map(function (k) { return putCover(k, c[k]); }));
}

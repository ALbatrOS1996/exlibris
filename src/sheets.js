/* Arkusze: dodawanie książki i szczegóły książki */

/* ---------- wybór okładki: plik, wklejenie (Ctrl+V / schowek), przeciągnięcie, adres URL ---------- */
var pickedCover = null; // { data: 'data:…' } albo { url: 'https://…' } albo { clear: true }
var pasteTarget = null, pickerShow = function () {};
function coverPickerHtml(b) {
  return '<div class="drop" id="drop"><div id="dropPrev">' + (b ? coverHtml(b) : phCover('Okładka', '')) + '</div><div class="txt"><b>Okładka</b>' +
    'Wklej zdjęcie (Ctrl+V), przeciągnij plik albo wybierz z urządzenia.' +
    '<div class="btnrow"><button type="button" class="pill sm" id="cvFile">' + ico('camera') + 'Wybierz</button>' +
    (navigator.clipboard && navigator.clipboard.read ? '<button type="button" class="pill sm ghost" id="cvPaste">Wklej</button>' : '') +
    '<button type="button" class="pill sm ghost" id="cvUrlBtn">URL</button></div>' +
    '<input type="file" accept="image/*" id="cvInput" hidden><input id="cvUrl" placeholder="https://…/okladka.jpg" hidden style="margin-top:8px;width:100%;height:38px;border-radius:12px;border:1px solid var(--line);background:var(--card);padding:0 10px"></div></div>';
}
function bindCoverPicker(root, getMeta, onPick) {
  pickedCover = null;
  var show = function (src) {
    var m = getMeta(); $('#dropPrev', root).innerHTML = src ? coverHtml({ title: m.title, author: m.author, cover: src }) : phCover(m.title || 'Okładka', m.author);
  };
  var take = function (blob) {
    shrinkImage(blob).then(function (d) { pickedCover = { data: d }; show(d); buzz(8); if (onPick) onPick(); })
      .catch(function () { toast('⚠️', 'Nie udało się wczytać obrazu'); });
  };
  $('#cvFile', root).onclick = function () { $('#cvInput', root).click(); };
  $('#cvInput', root).onchange = function () { if (this.files[0]) take(this.files[0]); };
  $('#cvUrlBtn', root).onclick = function () { var i = $('#cvUrl', root); i.hidden = !i.hidden; if (!i.hidden) i.focus(); };
  $('#cvUrl', root).onchange = function () { var u = this.value.trim(); if (/^https?:\/\//.test(u)) { pickedCover = { url: u }; show(u); if (onPick) onPick(); } };
  var pb = $('#cvPaste', root);
  if (pb) pb.onclick = function () {
    navigator.clipboard.read().then(function (items) {
      for (var i = 0; i < items.length; i++) {
        var t = items[i].types.filter(function (x) { return x.indexOf('image/') === 0; })[0];
        if (t) return items[i].getType(t).then(take);
      }
      toast('📋', 'W schowku nie ma obrazu', 'Skopiuj zdjęcie okładki i spróbuj ponownie.');
    }).catch(function () { toast('📋', 'Brak dostępu do schowka', 'Użyj Ctrl+V albo „Wybierz”.'); });
  };
  var drop = $('#drop', root);
  drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = function () { drop.classList.remove('over'); };
  drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); var f = e.dataTransfer.files[0]; if (f && /^image\//.test(f.type)) take(f); };
  pasteTarget = take;
  pickerShow = show;
  return { show: show };
}
document.addEventListener('paste', function (e) {
  if ($('#sheet').hidden || !pasteTarget || !e.clipboardData) return;
  var it = Array.prototype.filter.call(e.clipboardData.items || [], function (x) { return x.type.indexOf('image/') === 0; })[0];
  if (it) { e.preventDefault(); pasteTarget(it.getAsFile()); }
});
function applyCover(b) {
  if (!pickedCover) return;
  if (pickedCover.data) { b.cover = 'idb'; putCover(b.id, pickedCover.data); }
  else if (pickedCover.url) { if (b.cover === 'idb') putCover(b.id, null); b.cover = pickedCover.url; }
  pickedCover = null;
}

/* ---------- DODAWANIE ---------- */
var addState = { mode: 'search', q: '', results: null, pre: null };
function addSheet(mode) {
  addState.mode = mode || 'search'; addState.pre = null;
  drawAdd();
}
function drawAdd() {
  var a = addState, h = '<h2>Nowa książka</h2><div class="seg"><button data-mode="search" class="' + (a.mode === 'search' ? 'on' : '') + '">Wyszukaj</button><button data-mode="form" class="' + (a.mode === 'form' ? 'on' : '') + '">Wpisz ręcznie</button></div>';
  if (a.mode === 'search') {
    h += '<form class="searchrow" id="addSearch"><div class="searchbox">' + ico('search') + '<input id="addQ" placeholder="Tytuł, autor albo ISBN" value="' + esc(a.q) + '" enterkeyhint="search" autocomplete="off"></div>' +
      (canScan() ? '<button type="button" class="icon-btn" id="btnScan" aria-label="Skanuj kod ISBN" style="background:var(--card);color:var(--ink);border:1px solid var(--line)">' + ico('barcode') + '</button>' : '') +
      '<button class="icon-btn" aria-label="Szukaj">' + ico('arrow') + '</button></form><div id="scanBox"></div><div class="results" id="addRes">' + resultsHtml() + '</div>';
  } else h += formHtml(a.pre || {});
  var root = openSheet(h);
  root.querySelectorAll('[data-mode]').forEach(function (b) { b.onclick = function () { stopScan(); addState.mode = b.dataset.mode; if (b.dataset.mode === 'form' && !addState.pre) addState.pre = {}; drawAdd(); }; });
  if (a.mode === 'search') {
    $('#addSearch').onsubmit = function (e) { e.preventDefault(); runSearch($('#addQ').value); };
    if (!a.results) setTimeout(function () { var i = $('#addQ'); if (i && matchMedia('(pointer:fine)').matches) i.focus(); }, 300);
    var sb = $('#btnScan'); if (sb) sb.onclick = function () {
      $('#scanBox').innerHTML = '<div class="scan"><video muted></video></div><p class="muted" style="text-align:center;font-size:12.5px">Nakieruj aparat na kod kreskowy z tyłu książki</p>';
      startScan($('#scanBox video'), function (code) { $('#scanBox').innerHTML = ''; buzz([20, 30, 20]); $('#addQ').value = code; runSearch(code); })
        .catch(function () { $('#scanBox').innerHTML = ''; toast('📷', 'Brak dostępu do aparatu'); });
    };
    $('#addRes').onclick = function (e) {
      if (e.target.closest('[data-manual]')) { addState.mode = 'form'; addState.pre = { title: addState.q }; return drawAdd(); }
      var r = e.target.closest('[data-res]'); if (!r) return;
      var it = addState.results[+r.dataset.res];
      addState.pre = { title: it.title, author: it.author, year: it.year, pages: it.pages || '', cover: it.cover, isbn: it.isbn };
      addState.mode = 'form'; drawAdd();
    };
  } else bindForm(root, null);
}
function sourcesNote() {
  var on = ['Google Books', 'Open Library'];
  if (proxyUrl()) on = ['lubimyczytac', 'Biblioteka Narodowa', 'e-ISBN'].concat(on);
  return 'Szukam w: ' + on.join(', ') + '.' + (proxyUrl() ? '' : ' Polskie źródła (lubimyczytac, BN) włączysz w Trofea → Źródła wyszukiwania.');
}
function resultsHtml() {
  var r = addState.results, wait = addState.pending;
  if (r === 'loading') return '<div class="spin"></div><p class="muted" style="text-align:center;font-size:12.5px">' + sourcesNote() + '</p>';
  if (!r) return '<p class="muted" style="font-size:13px;margin:12px 4px">' + sourcesNote() + ' Numer ISBN (10 lub 13 cyfr) daje najpewniejszy wynik' + (canScan() ? ' – możesz go też zeskanować aparatem.' : '.') + '</p>';
  if (!r.length && wait) return '<div class="spin"></div>';
  if (!r.length) return '<div class="empty"><b>Nic nie znalazłem</b>Spróbuj innego zapisu albo <button class="pill sm" data-manual>wpisz ręcznie</button></div>';
  return r.map(function (it, i) {
    return '<div class="row" data-res="' + i + '">' + coverHtml(it) + '<div class="mid"><b>' + esc(it.title) + '</b><small>' + esc(it.author || 'autor nieznany') + '</small><small>' +
      [it.year, it.pages ? it.pages + ' s.' : '', it.isbn ? 'ISBN ' + it.isbn : ''].filter(Boolean).join(' · ') + '</small><small class="faint">' + esc((it.vias || [it.via]).join(' + ')) + '</small></div>' +
      '<div class="end"><span class="pill sm">Wybierz</span></div></div>';
  }).join('') + (wait ? '<p class="muted" style="text-align:center;font-size:12.5px;display:flex;align-items:center;gap:8px;justify-content:center"><span class="spin" style="margin:0;width:16px;height:16px;border-width:2px"></span>Czekam jeszcze na ' + wait + ' ' + plural(wait, 'źródło', 'źródła', 'źródeł') + '…</p>' : '');
}
function runSearch(q) {
  q = (q || '').trim(); if (!q) return;
  var id = (runSearch.n = (runSearch.n || 0) + 1);
  addState.q = q; addState.results = 'loading'; addState.pending = 1; $('#addRes').innerHTML = resultsHtml();
  var show = function (r, pending) {
    if (id !== runSearch.n) return;
    addState.results = r; addState.pending = pending;
    var el = $('#addRes'); if (el) el.innerHTML = resultsHtml();
  };
  searchBooks(q, show).then(function (r) { show(r, 0); });
}
function formHtml(p) {
  return coverPickerHtml(p.title || p.cover ? { title: p.title || '', author: p.author || '', cover: p.cover || '' } : null) +
    '<form id="bookForm"><label class="field"><span>Tytuł</span><input name="title" required value="' + esc(p.title || '') + '"></label>' +
    '<label class="field"><span>Autor</span><input name="author" value="' + esc(p.author || '') + '"></label>' +
    '<div class="two"><label class="field"><span>Rok wydania</span><input name="year" inputmode="numeric" value="' + esc(p.year || '') + '"></label>' +
    '<label class="field"><span>Liczba stron</span><input name="pages" type="number" min="1" inputmode="numeric" value="' + esc(p.pages || '') + '"></label></div>' +
    '<label class="field"><span>Status</span><select name="status"><option value="reading">Czytam teraz</option><option value="done">Już przeczytana</option><option value="want">Na później</option></select></label>' +
    '<div class="two"><label class="field" id="fStart"><span>Początek</span><input type="date" name="start" value="' + today() + '"></label>' +
    '<label class="field" id="fCur"><span>Jestem na stronie</span><input type="number" min="0" name="cur" value="0"></label>' +
    '<label class="field" id="fEnd" hidden><span>Koniec</span><input type="date" name="end" value="' + today() + '"></label></div>' +
    '<input type="hidden" name="isbn" value="' + esc(p.isbn || '') + '"><button class="pill" style="width:100%;margin-top:6px">' + ico('plus') + 'Dodaj na półkę</button></form>';
}
function bindForm(root, _) {
  var f = $('#bookForm', root);
  var meta = function () { return { title: f.title.value, author: f.author.value }; };
  bindCoverPicker(root, meta);
  if (addState.pre && addState.pre.cover) pickedCover = { url: addState.pre.cover };
  var sync = function () { var s = f.status.value; $('#fEnd', root).hidden = s !== 'done'; $('#fCur', root).hidden = s !== 'reading'; $('#fStart', root).hidden = s === 'want'; };
  f.status.onchange = sync; sync();
  f.title.oninput = f.author.oninput = function () { if (!pickedCover) pickerShow(''); };
  f.onsubmit = function (e) {
    e.preventDefault();
    var pages = +f.pages.value || 0, st = f.status.value;
    var b = newBook({ title: f.title.value.trim(), author: f.author.value.trim(), year: f.year.value.trim(), pages: pages, status: st,
      start: st === 'want' ? '' : f.start.value || today(), end: st === 'done' ? f.end.value || today() : '', isbn: f.isbn.value });
    if (st === 'reading' && +f.cur.value) { b.cur = Math.min(pages || 1e9, +f.cur.value); }
    if (st === 'done' && !pages) b.cur = 0;
    applyCover(b); save();
    closeSheet(); buzz([15, 30, 15]);
    if (st === 'done') { confetti(60); toast('📜', 'Dodano do przeczytanych', esc(b.title) + ' · ' + niceDate(b.end)); }
    else toast(st === 'want' ? '🔖' : '📖', st === 'want' ? 'Odłożone na później' : 'Na pulpicie!', esc(b.title));
    if (!b.cover || !b.pages) enrichBook(b).then(function (ch) { if (ch) { if (b.status === 'done') { b.cur = b.pages; save(); } render(); } });
    afterChange();
    V.tab = st === 'done' ? V.tab : 'shelf'; render();
  };
}

/* ---------- SZCZEGÓŁY ---------- */
function detailSheet(id) {
  var b = book(id); if (!b) return;
  var src = b.src ? CATS[b.src.list] : null, lbl = { reading: 'czytam', done: 'przeczytana', want: 'na później' };
  var h = '<div class="detail-top">' + coverHtml(b) + '<div><h2>' + esc(b.title) + '</h2><div class="au">' + esc(b.author) + (b.year ? ' · ' + esc(b.year) : '') + '</div>' +
    '<div class="src"><span class="badge-s ' + b.status + '" id="dStatus">' + lbl[b.status] + '</span>' + (src ? '<span class="badge-s want" style="color:var(--gold);background:color-mix(in srgb,var(--gold) 18%,transparent)">' + src.name + '</span>' : '') + '</div></div></div>';
  h += '<div class="card prog-card" style="padding:16px">' + '<div id="dRing">' + ring(pct(b), 'big') + '</div><div class="ctl">' +
    (b.pages ? '<div class="pgin"><input id="dPage" type="number" inputmode="numeric" min="0" max="' + b.pages + '" value="' + b.cur + '"><span>/ ' + b.pages + ' stron</span></div>' +
      '<input type="range" id="dRange" min="0" max="' + b.pages + '" value="' + b.cur + '">' +
      '<div class="quick" style="grid-template-columns:repeat(4,1fr);margin-top:10px"><button data-dadd="1">+1</button><button data-dadd="10">+10</button><button data-dadd="25">+25</button><button data-dadd="50">+50</button></div>'
      : '<p class="muted" style="margin:0 0 8px">Podaj liczbę stron, żeby śledzić postęp.</p><div class="pgin"><input id="dPagesSet" type="number" min="1" placeholder="np. 320"><button class="pill sm" id="dPagesOk">Zapisz</button></div>') +
    '</div></div>';
  h += '<div class="btnrow">' + (b.status !== 'done' ? '<button class="pill gold" id="dFinish">' + ico('check') + 'Ukończona</button>' : '') +
    (b.status === 'want' ? '<button class="pill" id="dStart">Zaczynam czytać</button>' : '') +
    (b.status === 'reading' ? '<button class="pill ghost" id="dLater">Na później</button>' : '') + '</div>';
  h += '<div class="sec" style="margin-top:18px"><h2>Ocena i notatki</h2></div><div class="stars" id="dStars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '" class="' + (b.rating >= n ? 'on' : '') + '">' + ico('star') + '</button>'; }).join('') + '</div>' +
    '<label class="field" style="margin-top:10px"><textarea id="dNotes" placeholder="Cytaty, myśli, kontekst historyczny…">' + esc(b.notes) + '</textarea></label>';
  h += '<div class="two"><label class="field"><span>Początek</span><input type="date" id="dStartD" value="' + esc(b.start) + '"></label>' +
    (b.status === 'done' ? '<label class="field"><span>Koniec (kalendarz)</span><input type="date" id="dEndD" value="' + esc(b.end) + '"></label>' : '<div></div>') + '</div>';
  if (b.log.length) {
    h += '<div class="sec"><h2>Dziennik</h2><span class="more">' + b.log.length + ' ' + plural(b.log.length, 'dzień', 'dni', 'dni') + '</span></div><div class="loglist">' +
      b.log.slice(-8).reverse().map(function (l) { return '<div><span>' + niceDate(l.d) + '</span><b>' + (l.p > 0 ? '+' : '') + l.p + ' s.</b></div>'; }).join('') + '</div>';
  }
  h += '<details style="margin-top:18px"><summary class="pill ghost" style="width:100%;list-style:none">Edytuj dane i okładkę</summary><div style="margin-top:14px">' + coverPickerHtml(b) +
    '<label class="field"><span>Tytuł</span><input id="eTitle" value="' + esc(b.title) + '"></label><label class="field"><span>Autor</span><input id="eAuthor" value="' + esc(b.author) + '"></label>' +
    '<div class="three"><label class="field"><span>Rok</span><input id="eYear" value="' + esc(b.year) + '"></label><label class="field"><span>Strony</span><input id="ePages" type="number" min="1" value="' + (b.pages || '') + '"></label>' +
    '<label class="field"><span>ISBN</span><input id="eIsbn" value="' + esc(b.isbn) + '"></label></div>' +
    '<div class="btnrow"><button class="pill" id="eSave">Zapisz zmiany</button><button class="pill ghost" id="eFind">Znajdź okładkę</button><button class="pill ghost" id="eDel" style="color:var(--rose)">' + ico('trash') + 'Usuń</button></div></div></details>';
  var root = openSheet(h, function () { render(); });
  bindDetail(root, b);
}
function bindDetail(root, b) {
  var upd = function (page, ev) {
    var res = setProgress(b, page);
    if (!res.delta) return;
    var c = $('#dRing .v', root), r = 54, C = 2 * Math.PI * r;
    c.style.strokeDashoffset = C * (1 - pct(b) / 100); $('#dRing span', root).textContent = pct(b) + '%';
    $('#dRing', root).classList.remove('pop'); void $('#dRing', root).offsetWidth; $('#dRing', root).classList.add('pop');
    if ($('#dPage', root)) { $('#dPage', root).value = b.cur; $('#dRange', root).value = b.cur; }
    if (res.finished) closeSheet();
    celebrateProgress(b, res, ev);
  };
  if (b.pages) {
    $('#dPage', root).onchange = function (e) { upd(+this.value, e); };
    $('#dRange', root).onchange = function (e) { upd(+this.value, e); };
    $('#dRange', root).oninput = function () { $('#dPage', root).value = this.value; };
    $$('[data-dadd]', root).forEach(function (x) { x.onclick = function (e) { upd(b.cur + +x.dataset.dadd, e); }; });
  } else {
    $('#dPagesOk', root).onclick = function () { var n = +$('#dPagesSet', root).value; if (n > 0) { b.pages = n; if (b.status === 'done') b.cur = n; save(); detailSheet(b.id); } };
  }
  var fin = $('#dFinish', root); if (fin) fin.onclick = function () {
    if (!b.pages) { toast('📏', 'Najpierw podaj liczbę stron'); return; }
    var before = pct(b); finishBook(b); closeSheet(); celebrateFinish(b);
  };
  var st = $('#dStart', root); if (st) st.onclick = function () { b.status = 'reading'; b.start = today(); save(); toast('📖', 'Na pulpicie!', esc(b.title)); detailSheet(b.id); };
  var lt = $('#dLater', root); if (lt) lt.onclick = function () { b.status = 'want'; save(); closeSheet(); };
  $('#dStars', root).onclick = function (e) {
    var n = e.target.closest('button'); if (!n) return;
    b.rating = b.rating === +n.dataset.n ? 0 : +n.dataset.n; save();
    $$('#dStars button', root).forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= b.rating); });
    n.classList.add('pop'); buzz(8); afterChange();
  };
  $('#dNotes', root).onchange = function () { b.notes = this.value; save(); };
  $('#dStartD', root).onchange = function () { b.start = this.value; save(); };
  var ed = $('#dEndD', root); if (ed) ed.onchange = function () { if (this.value) { b.end = this.value; save(); toast('📅', 'Data ukończenia: ' + niceDate(b.end)); } };
  bindCoverPicker(root, function () { return { title: $('#eTitle', root).value, author: $('#eAuthor', root).value }; }, function () { applyCover(b); save(); });
  $('#eSave', root).onclick = function () {
    b.title = $('#eTitle', root).value.trim() || b.title; b.author = $('#eAuthor', root).value.trim(); b.year = $('#eYear', root).value.trim(); b.isbn = $('#eIsbn', root).value.trim();
    var p = +$('#ePages', root).value || 0;
    if (p !== b.pages) { b.pages = p; if (b.status === 'done') b.cur = p; else b.cur = Math.min(b.cur, p); }
    applyCover(b); save(); toast('✔️', 'Zapisano'); detailSheet(b.id);
  };
  $('#eFind', root).onclick = function () {
    var was = b.cover; if (b.cover !== 'idb') b.cover = '';
    this.textContent = 'Szukam…';
    enrichBook(b).then(function (ch) { if (!ch) { b.cover = was; toast('🔍', 'Nie znalazłem okładki', 'Wklej ją albo wybierz plik.'); } else toast('🖼️', 'Okładka znaleziona'); save(); detailSheet(b.id); });
  };
  $('#eDel', root).onclick = function () {
    if (!confirm('Usunąć „' + b.title + '” z półki? Zniknie też z kalendarza.')) return;
    S.books = S.books.filter(function (x) { return x !== b; }); if (b.cover === 'idb') putCover(b.id, null); save(); closeSheet();
  };
}

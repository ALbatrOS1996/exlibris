/* Wyszukiwanie książek: Google Books + Open Library (oba bez klucza), skaner kodu ISBN */
function cleanIsbn(q) { return (q || '').replace(/[^0-9Xx]/g, '').toUpperCase(); }
function isIsbn(q) {
  var s = cleanIsbn(q);
  return (s.length === 10 || s.length === 13) && /^[0-9]{9,12}[0-9X]$/.test(s) && !/[a-wyzA-WYZ]/.test(q);
}
function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, ' ').trim(); }
function getJSON(url, ms) {
  var ctl = window.AbortController ? new AbortController() : null;
  var t = ctl && setTimeout(function () { ctl.abort(); }, ms || 9000);
  return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
}

function googleBooks(q, isbn, extra) {
  var query = isbn ? 'isbn:' + cleanIsbn(q) : q;
  var url = 'https://www.googleapis.com/books/v1/volumes?maxResults=15&printType=books&q=' + encodeURIComponent(query) + (extra || '');
  return getJSON(url).catch(function (e) {
    // limit zapytań bez klucza – jedna ponowna próba
    if (e.message === '429') return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return getJSON(url); });
    throw e;
  }).then(function (d) {
    return (d.items || []).map(function (it) {
      var v = it.volumeInfo || {}, ids = v.industryIdentifiers || [], isb = '';
      ids.forEach(function (x) { if (x.type === 'ISBN_13' || (!isb && x.type === 'ISBN_10')) isb = x.identifier; });
      var img = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
      if (img) img = img.replace(/^http:/, 'https:').replace('&edge=curl', '');
      return { title: v.title + (v.subtitle && v.title.length < 40 ? '. ' + v.subtitle : ''), author: (v.authors || []).join(', '),
        year: (v.publishedDate || '').slice(0, 4), pages: v.pageCount || 0, cover: img || '', isbn: isb, lang: v.language || '', via: 'Google Books' };
    });
  }).catch(function () { return []; });
}
function openLibrary(q, isbn) {
  var f = '&limit=12&fields=title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,language';
  var url = 'https://openlibrary.org/search.json?' + (isbn ? 'isbn=' + cleanIsbn(q) : 'q=' + encodeURIComponent(q)) + f;
  return getJSON(url).then(function (d) {
    return (d.docs || []).map(function (v) {
      var isb = isbn ? cleanIsbn(q) : ((v.isbn || []).filter(function (x) { return x.length === 13; })[0] || (v.isbn || [])[0] || '');
      return { title: v.title, author: (v.author_name || []).slice(0, 3).join(', '), year: v.first_publish_year ? String(v.first_publish_year) : '',
        pages: v.number_of_pages_median || 0, cover: v.cover_i ? 'https://covers.openlibrary.org/b/id/' + v.cover_i + '-L.jpg' : '',
        isbn: isb, lang: (v.language || []).indexOf('pol') >= 0 ? 'pl' : '', via: 'Open Library' };
    });
  }).catch(function () { return []; });
}

/* łączy wyniki, usuwa duplikaty, uzupełnia brakujące pola (okładka/strony) z drugiego źródła */
function searchBooks(q) {
  var isbn = isIsbn(q);
  return Promise.all([googleBooks(q, isbn), openLibrary(q, isbn)]).then(function (rs) {
    var out = [], idx = {};
    rs[0].concat(rs[1]).forEach(function (r) {
      if (!r.title) return;
      var k = norm(r.title).slice(0, 40) + '|' + norm(r.author).split(' ').slice(-1)[0];
      if (idx[k] != null) {
        var o = out[idx[k]];
        if (!o.cover && r.cover) o.cover = r.cover;
        if (!o.pages && r.pages) o.pages = r.pages;
        if (!o.isbn && r.isbn) o.isbn = r.isbn;
        if (!o.year && r.year) o.year = r.year;
        return;
      }
      idx[k] = out.length; out.push(r);
    });
    // polskie wydania i te z okładką wyżej
    out.forEach(function (r, i) { r._s = (r.lang === 'pl' ? 4 : 0) + (r.cover ? 2 : 0) + (r.pages ? 1 : 0) - i * .05; });
    out.sort(function (a, b) { return b._s - a._s; });
    if (isbn && out.length && !out[0].cover) out[0].cover = 'https://covers.openlibrary.org/b/isbn/' + cleanIsbn(q) + '-L.jpg?default=false';
    return out;
  });
}

/* dla książek dodanych z list: dociąga okładkę i liczbę stron w tle */
function enrichBook(b) {
  if (b.cover && b.pages) return Promise.resolve(false);
  var surname = (b.author || '').split(',')[0].split(' ').slice(-1)[0];
  var q = 'intitle:' + b.title + (surname && surname !== 'anonim' ? ' inauthor:' + surname : '');
  return googleBooks(q, false, '&langRestrict=pl').then(function (r) {
    return r.length ? r : googleBooks(b.title + ' ' + (surname || ''), false);
  }).then(function (r) {
    if (!r.length || !r.some(function (x) { return x.cover; })) return openLibrary(b.title + ' ' + (surname || '')).then(function (o) { return r.concat(o); });
    return r;
  }).then(function (r) {
    var t = norm(b.title), changed = false;
    var good = r.filter(function (x) { var n = norm(x.title); return n.indexOf(t) === 0 || t.indexOf(n) === 0; });
    if (!good.length) good = r.slice(0, 2);
    var withCover = good.filter(function (x) { return x.cover; })[0], withPages = good.filter(function (x) { return x.pages > 30; })[0];
    if (!b.cover && withCover) { b.cover = withCover.cover; changed = true; }
    if (!b.pages && withPages) { b.pages = withPages.pages; changed = true; }
    if (!b.isbn && withCover && withCover.isbn) b.isbn = withCover.isbn;
    if (changed) save();
    return changed;
  }).catch(function () { return false; });
}

/* skaner kodu kreskowego (Chrome na Androidzie i inne z BarcodeDetector) */
var scanner = null;
function canScan() { return 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia; }
function startScan(video, onCode) {
  stopScan();
  var det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] });
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (stream) {
    scanner = { stream: stream, on: true };
    video.srcObject = stream; video.setAttribute('playsinline', ''); video.play();
    var tick = function () {
      if (!scanner || !scanner.on) return;
      det.detect(video).then(function (codes) {
        var c = codes.filter(function (x) { return /^97[89]/.test(x.rawValue) || x.rawValue.length === 10; })[0] || codes[0];
        if (c) { stopScan(); onCode(c.rawValue); } else setTimeout(tick, 250);
      }).catch(function () { setTimeout(tick, 400); });
    };
    tick();
  });
}
function stopScan() {
  if (scanner) { scanner.on = false; scanner.stream.getTracks().forEach(function (t) { t.stop(); }); scanner = null; }
}

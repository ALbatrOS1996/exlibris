/* Wyszukiwanie książek: Google Books, Open Library, a przez własny pośrednik także lubimyczytac.pl, Biblioteka Narodowa i e-ISBN; skaner ISBN */
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
  var url = 'https://www.googleapis.com/books/v1/volumes?maxResults=15&printType=books&q=' + encodeURIComponent(query) + (extra || '') +
    (S.settings.gkey ? '&key=' + encodeURIComponent(S.settings.gkey.trim()) : '');
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

/* ---------- pośrednik (Google Apps Script): lubimyczytac.pl, Biblioteka Narodowa, e-ISBN ---------- */
function proxyUrl() { return (S.settings.proxy || '').trim(); }
function viaProxy(params, ms) {
  var p = proxyUrl(); if (!p) return Promise.reject(new Error('brak pośrednika'));
  var ctl = window.AbortController ? new AbortController() : null;
  var t = ctl && setTimeout(function () { ctl.abort(); }, ms || 30000);
  return fetch(p + (p.indexOf('?') < 0 ? '?' : '&') + params, ctl ? { signal: ctl.signal } : {})
    .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.text(); });
}
function lubimyczytac(q) {
  return viaProxy('lc=' + encodeURIComponent(q)).then(function (txt) {
    return (JSON.parse(txt).items || []).map(function (it) {
      return { title: it.title, author: it.author, year: it.year || '', pages: it.pages || 0, cover: it.cover || '', isbn: (it.isbn || '').replace(/-/g, ''),
        lang: 'pl', series: it.series || '', via: 'lubimyczytac' };
    });
  }).catch(function () { return []; });
}
function bnRecord(b) {
  var f = function (tag, code) {
    for (var i = 0; i < b.marc.fields.length; i++) {
      var x = b.marc.fields[i][tag]; if (!x) continue;
      for (var j = 0; j < x.subfields.length; j++) if (x.subfields[j][code]) return x.subfields[j][code];
    }
    return '';
  };
  var title = (f('245', 'a') + ' ' + f('245', 'b')).replace(/\s*[\/:;=.]\s*$/, '').replace(/\s*[\/:;]\s*$/, '').replace(/\s+/g, ' ').trim();
  var au = f('100', 'a').replace(/[,.]\s*$/, ''), m = au.match(/^([^,]+),\s*(.+)$/);
  var pages = (f('300', 'a').match(/(\d+)\s*(,\s*\[\d+\]\s*)?(s\.|stron)/) || [])[1];
  return { title: title || b.title.split(' /')[0], author: m ? m[2] + ' ' + m[1] : au, year: (b.publicationYear || '').slice(0, 4), pages: +pages || 0,
    cover: '', isbn: cleanIsbn(f('020', 'a').split(' ')[0]), lang: b.language === 'polski' ? 'pl' : '', via: 'Biblioteka Narodowa' };
}
function bibNarodowa(q, isbn) {
  if (!proxyUrl()) return Promise.resolve([]);
  var base = 'https://data.bn.org.pl/api/networks/bibs.json?limit=15&kind=ksi%C4%85%C5%BCka&';
  var qs = [];
  if (isbn) qs.push('isbnIssn=' + cleanIsbn(q));
  else {
    var w = q.trim().split(/\s+/);
    qs.push('title=' + encodeURIComponent(q.trim()) + '&language=polski');
    if (w.length >= 2) qs.push('title=' + encodeURIComponent(w.slice(0, -1).join(' ')) + '&author=' + encodeURIComponent(w[w.length - 1]));
    if (w.length >= 3) qs.push('title=' + encodeURIComponent(w.slice(0, -2).join(' ')) + '&author=' + encodeURIComponent(w.slice(-2).join(' ')));
  }
  return Promise.all(qs.map(function (x) {
    return viaProxy('url=' + encodeURIComponent(base + x)).then(function (t) { return JSON.parse(t).bibs || []; }).catch(function () { return []; });
  })).then(function (rs) {
    var all = [].concat.apply([], rs).map(bnRecord).filter(function (r) { return r.title; });
    all.sort(function (a, b) { return (b.lang === 'pl') - (a.lang === 'pl') || (b.year || '').localeCompare(a.year || ''); });
    return all;
  });
}
function eIsbn(q) {
  if (!proxyUrl()) return Promise.resolve([]);
  return viaProxy('url=' + encodeURIComponent('https://e-isbn.pl/IsbnWeb/api.xml?isbn=' + cleanIsbn(q))).then(function (xml) {
    var d = new DOMParser().parseFromString(xml, 'text/xml'), out = [];
    var tx = function (el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : ''; };
    Array.prototype.forEach.call(d.getElementsByTagName('Product'), function (p) {
      var pages = 0;
      Array.prototype.forEach.call(p.getElementsByTagName('Extent'), function (e) { if (tx(e, 'ExtentType') === '00') pages = +tx(e, 'ExtentValue') || 0; });
      var au = tx(p, 'PersonNameInverted'), m = au.match(/^([^,]+),\s*(.+)$/);
      var sub = tx(p, 'Subtitle').replace(/\s*[\/:;]\s*$/, '');
      out.push({ title: tx(p, 'TitleText').replace(/\s*[\/:;]\s*$/, '') + (sub && sub.length < 50 ? '. ' + sub : ''), author: m ? m[2] + ' ' + m[1] : au,
        year: tx(p, 'Date').slice(0, 4), pages: pages, cover: '', isbn: cleanIsbn(q), lang: 'pl', via: 'e-ISBN' });
    });
    return out;
  }).catch(function () { return []; });
}

/* łączy wyniki, usuwa duplikaty, uzupełnia brakujące pola (okładka/strony) z innych źródeł */
var VIA_RANK = { 'lubimyczytac': 3, 'Biblioteka Narodowa': 1.5, 'e-ISBN': 2, 'Google Books': 1, 'Open Library': 0 };
function mergeResults(lists, q, isbn) {
  var out = [], idx = {};
  lists.forEach(function (list) {
    list.forEach(function (r) {
      if (!r.title) return;
      var k = isbn ? 'isbn' : norm(r.title).slice(0, 40) + '|' + norm(r.author).split(' ').slice(-1)[0];
      if (idx[k] != null) {
        var o = out[idx[k]];
        ['cover', 'pages', 'isbn', 'year', 'author'].forEach(function (f) { if (!o[f] && r[f]) o[f] = r[f]; });
        if (r.lang === 'pl') o.lang = 'pl';
        if (r.via === 'lubimyczytac' && r.cover) o.cover = r.cover; // polskie okładki są trafniejsze
        if (o.vias.indexOf(r.via) < 0) o.vias.push(r.via);
        return;
      }
      idx[k] = out.length; out.push(Object.assign({ vias: [r.via] }, r));
    });
  });
  var nq = norm(q);
  out.forEach(function (r, i) {
    var nt = norm(r.title);
    var via = Math.max.apply(null, r.vias.map(function (v) { return VIA_RANK[v] || 0; }));
    // tytuł zawarty w zapytaniu (lub odwrotnie) – najsilniejszy sygnał
    var hit = nt && (nq.indexOf(nt) >= 0 || nt.indexOf(nq) >= 0) ? 5 : 0;
    r._s = hit + (r.lang === 'pl' ? 3 : 0) + (r.cover ? 2 : 0) + (r.pages ? 1 : 0) + via + r.vias.length * .5 - i * .02;
  });
  out.sort(function (a, b) { return b._s - a._s; });
  if (isbn && out.length && !out[0].cover) out[0].cover = 'https://covers.openlibrary.org/b/isbn/' + cleanIsbn(q) + '-L.jpg?default=false';
  return out.slice(0, 20);
}
/* onUpdate(lista, ileJeszczeCzeka) – wyniki pokazują się w miarę napływania */
function searchBooks(q, onUpdate) {
  var isbn = isIsbn(q), lists = [], pending;
  var srcs = [googleBooks(q, isbn), openLibrary(q, isbn)];
  if (proxyUrl()) {
    var bn = bibNarodowa(q, isbn);
    srcs.push(bn);
    if (isbn) {
      var ei = eIsbn(q);
      srcs.push(ei);
      // lubimyczytac nie szuka po ISBN – szukamy po tytule znalezionym w rejestrach
      srcs.push(Promise.all([ei, bn]).then(function (r) {
        var hit = r[0][0] || r[1][0]; if (!hit) return [];
        return lubimyczytac(hit.title.split('. ')[0] + ' ' + (hit.author || '').split(' ').slice(-1)[0]).then(function (lc) {
          var same = lc.filter(function (x) { return x.isbn === cleanIsbn(q); });
          return (same.length ? same : lc.slice(0, 1)).map(function (x) { return Object.assign({}, x, { isbn: cleanIsbn(q) }); });
        });
      }));
    } else srcs.push(lubimyczytac(q));
  }
  pending = srcs.length;
  return Promise.all(srcs.map(function (p) {
    return p.catch(function () { return []; }).then(function (r) {
      lists.push(r); pending--;
      if (onUpdate) onUpdate(mergeResults(lists, q, isbn), pending);
    });
  })).then(function () { return mergeResults(lists, q, isbn); });
}

/* dla książek dodanych z list: dociąga okładkę i liczbę stron w tle */
function enrichBook(b) {
  if (b.cover && b.pages) return Promise.resolve(false);
  var surname = (b.author || '').split(',')[0].split(' ').slice(-1)[0];
  var q = 'intitle:' + b.title + (surname && surname !== 'anonim' ? ' inauthor:' + surname : '');
  var plain = b.title + (surname && surname !== 'anonim' ? ' ' + surname : '');
  // najpierw lubimyczytac (polskie okładki i strony), potem Google i Open Library
  var lc = proxyUrl() ? lubimyczytac(plain) : Promise.resolve([]);
  return lc.then(function (r0) {
    if (r0.some(function (x) { return x.cover && x.pages; })) return r0;
    return googleBooks(q, false, '&langRestrict=pl').then(function (r) {
      return r.length ? r : googleBooks(plain, false);
    }).then(function (r) { return r0.concat(r); });
  }).then(function (r) {
    if (!r.length || !r.some(function (x) { return x.cover; })) return openLibrary(b.title + ' ' + (surname || '')).then(function (o) { return r.concat(o); });
    return r;
  }).then(function (r) {
    var t = norm(b.title), changed = false;
    var good = r.filter(function (x) { var n = norm(x.title); return n && (n.indexOf(t) === 0 || t.indexOf(n) === 0); });
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

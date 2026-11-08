/* Diagnostyka źródeł wyszukiwania: każde źródło osobno, z czasem i surowym błędem – raport do skopiowania */
function diagRun(title, isbn, onRow) {
  var rows = [], gkey = S.settings.gkey ? '&key=' + encodeURIComponent(S.settings.gkey.trim()) : '';
  var raw = function (url, ms) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, ms || 30000);
    return fetch(url, { signal: ctl.signal }).then(function (r) {
      clearTimeout(t);
      return r.text().then(function (txt) { return { status: r.status, txt: txt }; });
    });
  };
  var px = function (params) { var p = proxyUrl(); return raw(p + (p.indexOf('?') < 0 ? '?' : '&') + params, 45000); };
  var bnBase = 'https://data.bn.org.pl/api/networks/bibs.json?limit=5&kind=ksi%C4%85%C5%BCka&';
  var w = title.trim().split(/\s+/), bnTitle = w.length > 1 ? 'title=' + encodeURIComponent(w.slice(0, -1).join(' ')) + '&author=' + encodeURIComponent(w[w.length - 1]) : 'title=' + encodeURIComponent(title);
  var tests = [
    ['Pośrednik – połączenie', true, function () { return px('test=1').then(function (r) { return /"ok":true/.test(r.txt) ? { n: 1, info: r.txt.trim() } : { err: 'HTTP ' + r.status + ': ' + r.txt.slice(0, 160) }; }); }],
    ['lubimyczytac – tytuł', true, function () {
      return px('lc=' + encodeURIComponent(title)).then(function (r) {
        var j = JSON.parse(r.txt);
        if (j.error) return { err: j.error };
        var it = j.items || [], full = it.filter(function (x) { return x.pages && x.cover; }).length;
        return { n: it.length, info: it.length ? '„' + it[0].title + '” · ze stronami i okładką: ' + full + '/' + it.length : '' };
      });
    }],
    ['Biblioteka Narodowa – tytuł', true, function () {
      return px('url=' + encodeURIComponent(bnBase + bnTitle)).then(function (r) {
        var j = JSON.parse(r.txt); if (j.error) return { err: j.error };
        return { n: (j.bibs || []).length, info: j.bibs && j.bibs[0] ? '„' + j.bibs[0].title.slice(0, 60) + '”' : '' };
      });
    }],
    ['Biblioteka Narodowa – ISBN', true, function () {
      return Promise.all(isbnVariants(isbn).map(function (v) { return px('url=' + encodeURIComponent(bnBase + 'isbnIssn=' + v)); })).then(function (rs) {
        var n = 0, first = '';
        rs.forEach(function (r) { var j = JSON.parse(r.txt); if (j.bibs) { n += j.bibs.length; if (!first && j.bibs[0]) first = j.bibs[0].title.slice(0, 60); } });
        return { n: n, info: first ? '„' + first + '”' : '' };
      });
    }],
    ['e-ISBN – ISBN', true, function () {
      return Promise.all(isbnVariants(isbn).map(function (v) { return px('url=' + encodeURIComponent('https://e-isbn.pl/IsbnWeb/api.xml?isbn=' + v)); })).then(function (rs) {
        var n = 0; rs.forEach(function (r) { n += (r.txt.match(/<Product[ >]/g) || []).length; });
        if (!n && rs[0] && /error/.test(rs[0].txt)) return { err: rs[0].txt.slice(0, 160) };
        return { n: n };
      });
    }],
    ['Google Books – tytuł' + (gkey ? ' (Twój klucz)' : ' (bez klucza)'), false, function () {
      return raw('https://www.googleapis.com/books/v1/volumes?maxResults=5&q=' + encodeURIComponent(title) + gkey, 15000).then(function (r) {
        if (r.status !== 200) { var m = ''; try { m = JSON.parse(r.txt).error.message; } catch (e) {} return { err: 'HTTP ' + r.status + (m ? ': ' + m.slice(0, 120) : '') }; }
        return { n: (JSON.parse(r.txt).items || []).length };
      });
    }],
    ['Open Library – tytuł', false, function () {
      return raw('https://openlibrary.org/search.json?limit=5&fields=title&q=' + encodeURIComponent(title), 15000).then(function (r) { return { n: (JSON.parse(r.txt).docs || []).length }; });
    }],
    ['Open Library – ISBN', false, function () {
      return Promise.all(isbnVariants(isbn).map(function (v) { return raw('https://openlibrary.org/search.json?fields=title&isbn=' + v, 15000); }))
        .then(function (rs) { return { n: rs.reduce(function (s, r) { return s + (JSON.parse(r.txt).numFound || 0); }, 0) }; });
    }],
    ['Pełne wyszukiwanie – ISBN', false, function () {
      return searchBooks(isbn).then(function (r) { return { n: r.length, info: r[0] ? '„' + r[0].title + '” · ' + (r[0].pages || '?') + ' s. · ' + (r[0].cover ? 'okładka' : 'bez okładki') + ' · ' + (r[0].vias || []).join('+') : '' }; });
    }]
  ];
  // po kolei, żeby czasy odpowiedzi były miarodajne
  return tests.reduce(function (chain, t) {
    return chain.then(function () {
      if (t[1] && !proxyUrl()) { var r0 = { name: t[0], skip: true }; rows.push(r0); onRow(r0); return; }
      var t0 = Date.now();
      return t[2]().catch(function (e) { return { err: e.name === 'AbortError' ? 'przekroczony czas oczekiwania' : (e.message || String(e)) }; }).then(function (res) {
        var row = Object.assign({ name: t[0], ms: Date.now() - t0 }, res);
        rows.push(row); onRow(row);
      });
    });
  }, Promise.resolve()).then(function () { return rows; });
}
function diagLine(r) {
  var mark = r.skip ? '–' : r.err ? '✗' : r.n ? '✓' : '○';
  return mark + ' ' + r.name + ': ' + (r.skip ? 'pominięte (brak pośrednika)' : r.err ? 'BŁĄD ' + r.err : r.n + ' wyn.') +
    (r.ms != null ? ' · ' + (r.ms / 1000).toFixed(1) + ' s' : '') + (r.info ? ' · ' + r.info : '');
}
function diagSheet() {
  var root = openSheet('<h2>Diagnostyka źródeł</h2><p class="muted" style="font-size:13px;margin:4px 0 12px">Sprawdzam każde źródło osobno. Wpisz tytuł i numer ISBN, które słabo się wyszukują (albo zostaw przykładowe).</p>' +
    '<label class="field"><span>Tytuł (z autorem)</span><input id="dgT" value="Zniewolony umysł Miłosz"></label>' +
    '<label class="field"><span>ISBN</span><input id="dgI" inputmode="numeric" value="9788381915519"></label>' +
    '<button class="pill" id="dgRun" style="width:100%">Uruchom test</button><div class="loglist" id="dgOut" style="margin-top:14px;overflow-wrap:anywhere;min-width:0"></div>' +
    '<button class="pill ghost" id="dgCopy" style="width:100%;margin-top:12px" hidden>Kopiuj raport</button>');
  var lines = [];
  $('#dgRun', root).onclick = function () {
    var btn = this; btn.disabled = true; btn.textContent = 'Testuję…'; lines = []; $('#dgOut', root).innerHTML = ''; $('#dgCopy', root).hidden = true;
    diagRun($('#dgT', root).value, $('#dgI', root).value, function (r) {
      var l = diagLine(r); lines.push(l);
      var d = document.createElement('div'); d.style.display = 'block'; d.style.color = r.err ? 'var(--rose)' : r.n ? 'var(--ink)' : 'var(--mute)'; d.textContent = l;
      $('#dgOut', root).appendChild(d);
    }).then(function () { btn.disabled = false; btn.textContent = 'Uruchom ponownie'; $('#dgCopy', root).hidden = false; });
  };
  $('#dgCopy', root).onclick = function () {
    var rep = 'Ex Libris – diagnostyka ' + new Date().toLocaleString('pl-PL') + '\nTytuł: ' + $('#dgT', root).value + ' | ISBN: ' + $('#dgI', root).value +
      '\nPośrednik: ' + (proxyUrl() ? 'ustawiony' : 'brak') + ' | Klucz Google: ' + (S.settings.gkey ? 'tak' : 'nie') + '\n' + navigator.userAgent + '\n\n' + lines.join('\n');
    var ok = function () { toast('📋', 'Raport skopiowany', 'Wklej go w rozmowie z Claude.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(rep).then(ok, function () { prompt('Skopiuj raport:', rep); });
    else prompt('Skopiuj raport:', rep);
  };
}

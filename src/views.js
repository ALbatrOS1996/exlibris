/* Widoki: Półka, Kalendarz, Kanon, Czarne, Trofea */
var V = { tab: 'shelf', libFilter: 'all', libQ: '', calY: new Date().getFullYear(), calM: new Date().getMonth(),
  cat: { kanon: { q: '', f: 'all', open: {}, limit: {} }, czarne: { q: '', f: 'all', series: '', open: {}, limit: {} } } };

function render() {
  var v = $('#view'), fn = { shelf: viewShelf, cal: viewCal, kanon: function () { return viewCat('kanon'); }, czarne: function () { return viewCat('czarne'); }, trophy: viewTrophy }[V.tab];
  v.innerHTML = fn();
  $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === V.tab); });
  $('#fab').hidden = V.tab !== 'shelf';
  animateIn(v);
  updateRankLine();
}

/* ---------- PÓŁKA ---------- */
var BUST = '<svg class="bust" viewBox="0 0 150 170" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".55">' +
  '<path d="M38 30h74M42 30c0-8 6-12 14-12M108 30c0-8-6-12-14-12M50 18h50" stroke="var(--gold)"/>' +
  '<circle cx="44" cy="38" r="7" stroke="var(--gold)"/><circle cx="106" cy="38" r="7" stroke="var(--gold)"/>' +
  '<path d="M52 36v118M98 36v118M62 36v118M88 36v118M75 36v118" opacity=".7"/>' +
  '<path d="M44 154h62M38 162h74" stroke="var(--gold)"/>' +
  '<g stroke="var(--sage)" stroke-width="1.8"><path d="M22 120c4-26 16-44 34-54"/><path d="M128 120c-4-26-16-44-34-54"/>' +
  '<path d="M28 98c-7-1-11-6-11-12 7 1 11 6 11 12zM34 84c-6-3-8-9-6-15 6 3 8 9 6 15zM42 73c-5-4-6-10-3-15 5 4 6 10 3 15zM24 112c-7 0-12-4-13-10 7 0 12 4 13 10z"/>' +
  '<path d="M122 98c7-1 11-6 11-12-7 1-11 6-11 12zM116 84c6-3 8-9 6-15-6 3-8 9-6 15zM108 73c5-4 6-10 3-15-5 4-6 10-3 15zM126 112c7 0 12-4 13-10-7 0-12 4-13 10z"/></g></svg>';

function greeting() {
  var h = new Date().getHours();
  return h < 5 ? 'Lucubratio' : h < 12 ? 'Salve!' : h < 18 ? 'Ave, lectorze!' : 'Vespera';
}
function viewShelf() {
  var reading = byStatus('reading'), x = xp(), r = rankOf(x), st = streak(), y = today().slice(0, 4);
  var yearDone = finished().filter(function (b) { return b.end.slice(0, 4) === y; }).length;
  var monday = (function () { var d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); })();
  var weekPages = pagesInRange(monday, today()), todayP = pagesOn(today()), g = S.settings.dayGoal || 20;
  var sub = reading.length ? 'Na pulpicie ' + reading.length + ' ' + plural(reading.length, 'książka', 'książki', 'książek') + '. ' + (st ? 'Seria trwa – nie przerywaj jej dziś.' : 'Zacznij serię: kilka stron dziennie wystarczy.')
    : 'Twoja półka czeka. Dodaj książkę albo wybierz coś z Kanonu Europy lub z Czarnego.';
  var h = '<section class="card hero">' + BUST + '<h1>' + greeting() + '</h1><p class="sub">' + sub + '</p>' +
    '<div class="xp"><div class="xp-row"><span>' + r.name + '</span><b>' + fmt(x) + (r.to ? ' / ' + fmt(r.to) : '') + ' XP</b></div>' +
    bar(r.to ? (x - r.from) / (r.to - r.from) * 100 : 100, 'gold') + '</div></section>';
  h += '<div class="stats">' +
    '<div class="stat"><b>' + yearDone + '</b><span>w ' + y + (S.settings.yearGoal ? ' / ' + S.settings.yearGoal : '') + '</span></div>' +
    '<div class="stat"><b>' + fmt(weekPages) + '</b><span>stron w tygodniu</span></div>' +
    '<div class="stat flame ' + (st ? '' : 'cold') + '"><b>' + ico('flame') + st + '</b><span>' + plural(st, 'dzień', 'dni', 'dni') + ' z rzędu</span></div>' +
    '<div class="stat"><b>' + fmt(totalPages()) + '</b><span>stron łącznie</span></div></div>';

  h += '<div class="sec"><h2>Teraz czytam</h2>' + (reading.length > 1 ? '<span class="more">przewiń ' + ico('arrow') + '</span>' : '') + '</div>';
  if (reading.length) {
    h += '<div class="reel">' + reading.map(function (b) {
      var p = pct(b);
      return '<article class="card now" data-id="' + b.id + '"><div class="now-top" data-open="' + b.id + '">' + coverHtml(b) +
        '<div class="now-info"><h3>' + esc(b.title) + '</h3><div class="au">' + esc(b.author) + '</div>' +
        '<div class="ring-wrap">' + ring(p) + '<small>' + (b.pages ? 'strona <b>' + b.cur + '</b><br>z ' + b.pages : 'brak liczby stron') + '</small></div></div></div>' +
        (b.pages ? '<div class="quick"><button data-add="5">+5</button><button data-add="10">+10</button><button data-add="25">+25</button><button class="page" data-open="' + b.id + '">Strona…</button></div>'
          : '<button class="pill gold" data-open="' + b.id + '">Podaj liczbę stron</button>') + '</article>';
    }).join('') + '</div>';
  } else h += '<div class="empty"><b>Pusty pulpit</b>Kliknij <b style="display:inline;font-size:inherit;color:var(--sage)">+</b>, by dodać książkę, albo zajrzyj do zakładek Kanon i Czarne.</div>';

  h += '<div class="sec"><h2>Cel dnia</h2></div><div class="card goal">' + ring(Math.min(100, Math.round(todayP / g * 100)), '', todayP) +
    '<div class="txt"><b>' + (todayP >= g ? 'Cel osiągnięty! 🎉' : 'Jeszcze ' + (g - todayP) + ' ' + plural(g - todayP, 'strona', 'strony', 'stron')) + '</b>' +
    '<p>Dzienny cel: ' + g + ' stron · najdłuższa seria: ' + bestStreak() + ' ' + plural(bestStreak(), 'dzień', 'dni', 'dni') + '</p>' + weekStrip() + '</div></div>';

  var fin = finished().slice(0, 14);
  if (fin.length) {
    h += '<div class="sec"><h2>Ostatnio ukończone</h2><button class="more" data-go="cal">kalendarz ' + ico('arrow') + '</button></div><div class="spines">' +
      fin.map(function (b) { var d = parseIso(b.end); return '<div class="spine" data-open="' + b.id + '">' + coverHtml(b) + '<span class="tag">' + d.getDate() + ' ' + MON3[d.getMonth()].toUpperCase() + '</span><small>' + '★'.repeat(b.rating || 0) + '</small></div>'; }).join('') + '</div>';
  }

  h += '<div class="sec"><h2>Biblioteka</h2><span class="more">' + S.books.length + ' ' + plural(S.books.length, 'pozycja', 'pozycje', 'pozycji') + '</span></div>';
  if (S.books.length) {
    var cnt = function (s) { return s === 'all' ? S.books.length : byStatus(s).length; };
    h += '<div class="searchbox">' + ico('search') + '<input id="libQ" placeholder="Szukaj w bibliotece" value="' + esc(V.libQ) + '"></div>' +
      '<div class="chips" style="margin-top:10px">' + [['all', 'Wszystkie'], ['reading', 'Czytam'], ['done', 'Przeczytane'], ['want', 'Na później']].map(function (c) {
        return '<button class="chip ' + (V.libFilter === c[0] ? 'on' : '') + '" data-lib="' + c[0] + '">' + c[1] + '<span class="n">' + cnt(c[0]) + '</span></button>';
      }).join('') + '</div><div class="list" id="libList">' + libRows() + '</div>';
  }
  return h;
}
function weekStrip() {
  var m = dayMap(), g = S.settings.dayGoal || 20, out = '<div style="display:flex;gap:5px">';
  for (var i = 6; i >= 0; i--) {
    var d = addDays(today(), -i), p = m[d] || 0, dt = parseIso(d);
    out += '<div title="' + d + ': ' + p + ' s." style="flex:1;text-align:center;font-size:10px;font-weight:800;color:var(--faint)"><div style="height:26px;border-radius:8px;margin-bottom:3px;background:' +
      (p >= g ? 'var(--sage)' : p ? 'color-mix(in srgb,var(--sage) 40%,var(--card2))' : 'var(--card2)') + '"></div>' + 'NPWŚCPS'[dt.getDay()] + '</div>';
  }
  return out + '</div>';
}
function libRows() {
  var q = norm(V.libQ), order = { reading: 0, want: 1, done: 2 };
  var list = S.books.filter(function (b) { return (V.libFilter === 'all' || b.status === V.libFilter) && (!q || norm(b.title + ' ' + b.author).indexOf(q) >= 0); });
  list.sort(function (a, b) { return order[a.status] - order[b.status] || (b.end || b.added || '').localeCompare(a.end || a.added || ''); });
  if (!list.length) return '<div class="empty">Nic tu nie ma.</div>';
  var lbl = { reading: 'czytam', done: 'przeczytana', want: 'na później' };
  return list.map(function (b) {
    return '<div class="row" data-open="' + b.id + '">' + coverHtml(b) + '<div class="mid"><b>' + esc(b.title) + '</b><small>' + esc(b.author) + (b.pages ? ' · ' + b.pages + ' s.' : '') + '</small>' +
      (b.status === 'reading' ? bar(pct(b)) : '') + '</div><div class="end"><span class="badge-s ' + b.status + '">' + (b.status === 'done' ? ico('check') : '') + lbl[b.status] + '</span>' +
      (b.status === 'done' && b.end ? '<div style="margin-top:4px">' + niceDate(b.end) + '</div>' : b.status === 'reading' ? '<div style="margin-top:4px">' + pct(b) + '%</div>' : '') + '</div></div>';
  }).join('');
}

/* ---------- KALENDARZ ---------- */
function viewCal() {
  var y = V.calY, m = V.calM, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), off = (first.getDay() + 6) % 7;
  var ym = y + '-' + pad(m + 1), dm = dayMap(), td = today();
  var fin = finished().filter(function (b) { return b.end.slice(0, 7) === ym; }).sort(function (a, b) { return a.end < b.end ? -1 : 1; });
  var byDay = {}; fin.forEach(function (b) { (byDay[b.end] = byDay[b.end] || []).push(b); });
  var monthPages = pagesInRange(ym + '-01', ym + '-31'), readDays = Object.keys(dm).filter(function (k) { return k.slice(0, 7) === ym && dm[k] > 0; }).length;
  var g = S.settings.dayGoal || 20;
  var h = '<div class="cal-head"><button class="icon-btn" data-cal="-1" aria-label="Poprzedni miesiąc">' + ico('left') + '</button><h1>' + MONTHS[m] + ' ' + y +
    '<small>' + (fin.length ? 'Ukończone: ' + fin.length + ' ' + plural(fin.length, 'książka', 'książki', 'książek') : 'Brak ukończonych w tym miesiącu') + '</small></h1>' +
    '<button class="icon-btn" data-cal="1" aria-label="Następny miesiąc">' + ico('right') + '</button></div>';
  h += '<div class="cal-sum"><div class="stat"><b>' + fin.length + '</b><span>' + plural(fin.length, 'książka', 'książki', 'książek') + '</span></div>' +
    '<div class="stat"><b>' + fmt(monthPages) + '</b><span>stron</span></div><div class="stat"><b>' + readDays + '</b><span>dni czytania</span></div></div>';
  h += '<div class="grid7">' + ['PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO', 'ND'].map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
  for (var i = 0; i < off; i++) h += '<div class="day out"></div>';
  for (var d = 1; d <= days; d++) {
    var k = ym + '-' + pad(d), p = dm[k] || 0, f = byDay[k];
    var cls = 'day' + (k === td ? ' today' : '') + (p > 0 ? ' act' : '') + (f ? ' fin' : '');
    h += '<div class="' + cls + '" style="--a:' + Math.min(1, p / (g * 1.5)).toFixed(2) + '"' + (f ? ' data-day="' + k + '"' : '') + '>' +
      (f ? '<div class="thumbs">' + coverHtml(f[f.length - 1]) + '</div>' : '') + '<span class="dn">' + d + '</span>' +
      (f && f.length > 1 ? '<span class="cnt">×' + f.length + '</span>' : f ? '<span class="cnt">' + ico('check') + '</span>' : '') +
      (!f && p > 0 ? '<span class="pg">' + p + ' s.</span>' : '') + '</div>';
  }
  h += '</div>';
  // rok w słupkach
  var per = []; for (var j = 0; j < 12; j++) per.push(0);
  finished().forEach(function (b) { if (+b.end.slice(0, 4) === y) per[+b.end.slice(5, 7) - 1]++; });
  var mx = Math.max.apply(null, per.concat([1])), tot = per.reduce(function (a, b) { return a + b; }, 0);
  h += '<div class="sec"><h2>Rok ' + y + '</h2><span class="more">' + tot + ' ' + plural(tot, 'książka', 'książki', 'książek') + (S.settings.yearGoal && y === new Date().getFullYear() ? ' · cel ' + S.settings.yearGoal : '') + '</span></div>' +
    '<div class="card" style="padding:14px 12px 10px"><div class="months">' + per.map(function (n, i) {
      return '<button data-mon="' + i + '" class="' + (i === m ? 'on' : '') + '"><b>' + (n || '') + '</b><i style="height:' + (n / mx * 56) + 'px"></i>' + MON3[i] + '</button>';
    }).join('') + '</div>' + (S.settings.yearGoal && y === new Date().getFullYear() ? '<div style="margin-top:10px">' + bar(tot / S.settings.yearGoal * 100) + '</div>' : '') + '</div>';
  if (fin.length) {
    h += '<div class="sec"><h2>Ukończone w ' + MONTHS_LOC[m] + '</h2></div><div class="list fin-list">' +
      fin.map(function (b) {
        var dt = parseIso(b.end);
        return '<div class="row" data-open="' + b.id + '"><div class="date"><b>' + dt.getDate() + '</b><small>' + MON3[dt.getMonth()] + '</small></div>' + coverHtml(b) +
          '<div class="mid"><b>' + esc(b.title) + '</b><small>' + esc(b.author) + '</small><small>' + (b.pages ? b.pages + ' stron' : '') + (b.start ? ' · od ' + niceDate(b.start) : '') + '</small></div>' +
          '<div class="end" style="color:var(--gold)">' + '★'.repeat(b.rating || 0) + '</div></div>';
      }).join('') + '</div>';
  }
  return h;
}
function daySheet(k) {
  var list = finished().filter(function (b) { return b.end === k; });
  openSheet('<h2>' + niceDate(k) + '</h2><p class="muted">Tego dnia ukończono: ' + list.length + '</p><div class="list">' + list.map(function (b) {
    return '<div class="row" data-open="' + b.id + '">' + coverHtml(b) + '<div class="mid"><b>' + esc(b.title) + '</b><small>' + esc(b.author) + '</small></div></div>';
  }).join('') + '</div>');
}

/* ---------- KATALOGI ---------- */
var CAT_INFO = {
  kanon: ['Kanon Europy', 'Eposy, poematy i książki, które współtworzą tożsamość 46 krajów – od „Bogurodzicy” po „Zniewolony umysł”.'],
  czarne: ['Czarne', 'Literatura faktu Wydawnictwa Czarne o Europie: reportaż, esej, historia, biografie – według krajów.']
};
function catRowMatch(list, r, i, q, st) {
  var c = V.cat[list];
  if (c.f === 'todo' && st) return false;
  if (c.f === 'reading' && st !== 'reading') return false;
  if (c.f === 'done' && st !== 'done') return false;
  if (list === 'czarne' && c.series && r[4] !== c.series) return false;
  if (q && norm(r.join(' ')).indexOf(q) < 0) return false;
  return true;
}
function viewCat(list) {
  var c = V.cat[list], data = CATS[list].data, q = norm(c.q), tot = catCount(list), reading = 0;
  data.forEach(function (r, i) { if (catStatus(list, i) === 'reading') reading++; });
  var p = Math.round(tot.done / tot.n * 100);
  var h = '<section class="card cat-hero">' + ring(p, '', tot.done) + '<div class="txt"><h1>' + CAT_INFO[list][0] + '</h1><p>' + CAT_INFO[list][1] + '</p>' +
    '<p><b style="color:var(--sage)">' + tot.done + '</b> z ' + tot.n + ' przeczytane' + (reading ? ' · <b style="color:var(--gold)">' + reading + '</b> w trakcie' : '') + '</p></div></section>';
  h += '<div class="searchbox" style="margin-top:14px">' + ico('search') + '<input data-catq="' + list + '" placeholder="Szukaj: tytuł, autor, kraj…" value="' + esc(c.q) + '"></div>';
  h += '<div class="chips" style="margin-top:10px">' + [['all', 'Wszystkie'], ['todo', 'Do przeczytania'], ['reading', 'Czytam'], ['done', 'Przeczytane']].map(function (f) {
    return '<button class="chip ' + (c.f === f[0] ? 'on' : '') + '" data-catf="' + list + ':' + f[0] + '">' + f[1] + '</button>';
  }).join('') + '</div>';
  if (list === 'czarne') {
    var ser = {}; CZARNE.forEach(function (r) { ser[r[4]] = (ser[r[4]] || 0) + 1; });
    var names = Object.keys(ser).sort(function (a, b) { return ser[b] - ser[a]; });
    h += '<div class="chips"><button class="chip ' + (!c.series ? 'on' : '') + '" data-cats="">Wszystkie serie</button>' + names.map(function (n) {
      return '<button class="chip ' + (c.series === n ? 'on' : '') + '" data-cats="' + esc(n) + '">' + esc(n) + '<span class="n">' + ser[n] + '</span></button>';
    }).join('') + '</div>';
  }
  // grupowanie region → kraj
  var regions = [], rIdx = {};
  data.forEach(function (r, i) {
    if (!rIdx[r[0]]) { rIdx[r[0]] = { name: r[0], countries: [], cIdx: {} }; regions.push(rIdx[r[0]]); }
    var R = rIdx[r[0]];
    if (!R.cIdx[r[1]]) { R.cIdx[r[1]] = { name: r[1], all: [], show: [] }; R.countries.push(R.cIdx[r[1]]); }
    var st = catStatus(list, i), C = R.cIdx[r[1]];
    C.all.push(st);
    if (catRowMatch(list, r, i, q, st)) C.show.push(i);
  });
  var any = false, filtering = q || c.f !== 'all' || c.series;
  regions.forEach(function (R) {
    var cs = R.countries.filter(function (C) { return C.show.length; });
    if (!cs.length) return; any = true;
    var rd = 0, rn = 0; R.countries.forEach(function (C) { rn += C.all.length; rd += C.all.filter(function (s) { return s === 'done'; }).length; });
    h += '<section class="region"><h2>' + esc(R.name) + '<small>' + rd + ' / ' + rn + '</small></h2>';
    cs.forEach(function (C) {
      var d = C.all.filter(function (s) { return s === 'done'; }).length, key = list + '|' + C.name, open = filtering ? (q ? true : c.open[key]) : c.open[key];
      var ini = C.name === R.name ? 'EU' : C.name.replace(/^(Wielka Brytania: |Europa |Była )/, '').replace(/[^A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
      h += '<details class="country" data-key="' + esc(key) + '"' + (open ? ' open' : '') + '><summary><span class="flag ' + (d === C.all.length ? 'full' : '') + '" style="--h:' + hue(C.name) + '">' + (d === C.all.length ? ico('check') : esc(ini)) + '</span>' +
        '<span class="nm"><b>' + esc(C.name === R.name ? 'Kilka krajów naraz' : C.name) + '</b>' + bar(d / C.all.length * 100) + '</span><span class="ct">' + d + '/' + C.all.length + (filtering && C.show.length !== C.all.length ? ' · ' + C.show.length + ' pasuje' : '') + '</span>' + ico('down').replace('<svg>', '<svg class="chev">') + '</summary>' +
        (open ? '<div class="items">' + C.show.map(function (i) { return catItem(list, i); }).join('') + '</div>' : '') + '</details>';
    });
    h += '</section>';
  });
  if (!any) h += '<div class="empty" style="margin-top:16px"><b>Brak wyników</b>Zmień filtr albo wyszukiwane słowo.</div>';
  return h;
}
function catItem(list, i) {
  var r = CATS[list].data[i], b = srcBook(list, CATS[list].key(r, i)), st = b ? b.status : '';
  var body = list === 'kanon'
    ? '<b>' + esc(r[2]) + '</b>' + (r[3] ? '<span class="orig">' + esc(r[3]) + '</span>' : '') + '<div class="meta">' + esc(r[4]) + ' · <em>' + esc(r[5]) + '</em></div>' + (r[6] ? '<p>' + esc(r[6]) + '</p>' : '')
    : '<b>' + esc(r[3]) + '</b><div class="meta">' + esc(r[2]) + ' · <em>' + esc(r[4]) + '</em></div>' + (r[5] ? '<p>' + esc(r[5]) + '</p>' : '');
  var act = !b ? '<button class="pill sm" data-catadd="' + list + ':' + i + '">' + ico('plus') + 'Czytam</button>'
    : st === 'done' ? '<div class="state" data-open="' + b.id + '">przeczytana<br>' + (b.end ? niceDate(b.end).replace(/ \d{4}$/, '') : '') + '</div>'
    : st === 'reading' ? '<div class="state r" data-open="' + b.id + '">czytasz<br>' + (b.pages ? pct(b) + '%' : '') + '</div>'
    : '<div class="state" data-open="' + b.id + '" style="color:var(--sky)">na później</div>';
  return '<div class="item ' + st + '" data-ci="' + list + ':' + i + '"><button class="tick" data-cattick="' + list + ':' + i + '" aria-label="Oznacz jako przeczytaną">' + ico('check') + '</button>' +
    '<div class="body">' + body + '</div><div class="act">' + act + '</div></div>';
}
function addFromCat(list, i, status) {
  var C = CATS[list], r = C.data[i];
  var yr = (C.year(r) || '').match(/\d{4}/);
  var b = newBook({ title: C.title(r), author: C.author(r) === 'anonim' ? 'anonim' : C.author(r), year: yr ? yr[0] : '', status: status || 'reading',
    src: { list: list, key: C.key(r, i) } });
  enrichBook(b).then(function (ch) {
    if (!ch) return;
    if (b.status === 'done' && b.pages && b.cur < b.pages) { b.cur = b.pages; save(); }
    if (V.tab === 'shelf' || V.tab === 'cal') render(); else refreshCatItem(list, i);
  });
  return b;
}
function refreshCatItem(list, i) {
  var el = document.querySelector('[data-ci="' + list + ':' + i + '"]');
  if (el) { var t = document.createElement('div'); t.innerHTML = catItem(list, i); el.replaceWith(t.firstChild); }
}

/* ---------- TROFEA ---------- */
function viewTrophy() {
  var x = xp(), r = rankOf(x), bs = BADGES(), got = bs.filter(function (b) { return b.got; }).length, done = byStatus('done');
  var avg = done.length ? Math.round(done.reduce(function (s, b) { return s + (b.pages || 0); }, 0) / done.length) : 0;
  var h = '<section class="card rank-card">' + ring(r.to ? Math.round((x - r.from) / (r.to - r.from) * 100) : 100, 'big', (r.i + 1)) +
    '<div class="txt"><div class="lvl">Ranga ' + (r.i + 1) + ' z ' + RANKS.length + '</div><h1>' + r.name + '</h1><p class="muted" style="margin:6px 0 0">' + r.desc + '</p>' +
    '<p style="margin:8px 0 0;font-weight:700">' + fmt(x) + ' XP' + (r.to ? ' · do rangi „' + r.next + '”: ' + fmt(r.to - x) : '') + '</p></div></section>';
  h += '<div class="stats"><div class="stat"><b>' + done.length + '</b><span>przeczytanych</span></div><div class="stat"><b>' + fmt(totalPages()) + '</b><span>stron</span></div>' +
    '<div class="stat"><b>' + bestStreak() + '</b><span>najdł. seria</span></div><div class="stat"><b>' + avg + '</b><span>śr. stron</span></div></div>';
  h += '<div class="sec"><h2>Odznaki</h2><span class="more">' + got + ' / ' + bs.length + '</span></div><div class="badges">' + bs.map(function (b) {
    return '<div class="bdg ' + (b.got ? '' : 'locked') + '" style="--h:' + b.hue + '"><div class="medal">' + (b.got ? b.icon : '🔒') + '</div><b>' + b.name + '</b><small>' + b.desc + '</small>' +
      (!b.got && b.need > 1 ? '<div class="prog">' + bar(b.v / b.need * 100) + '</div><small>' + fmt(Math.min(b.v, b.need)) + ' / ' + fmt(b.need) + '</small>' : '') + '</div>';
  }).join('') + '</div>';
  h += '<div class="sec"><h2>Drabina rang</h2><span class="more">XP = strony + 60 za książkę + 30 za pozycję z list + 40 za odznakę</span></div><div class="ladder">' + RANKS.map(function (k, i) {
    return '<div class="' + (i === r.i ? 'on' : i < r.i ? 'got' : '') + '">' + (i < r.i ? '✓ ' : '') + k[1] + '<span>' + fmt(k[0]) + ' XP</span></div>';
  }).join('') + '</div>';
  h += '<div class="sec"><h2>Ustawienia</h2></div><div class="card settings">' +
    '<label>Dzienny cel (strony)<input type="number" min="1" max="500" id="setDay" value="' + S.settings.dayGoal + '"></label>' +
    '<label>Roczny cel (książki)<input type="number" min="1" max="500" id="setYear" value="' + S.settings.yearGoal + '"></label>' +
    '<label>Motyw<select id="setTheme" style="width:150px"><option value="dark">Atrament</option><option value="light"' + (S.settings.theme === 'light' ? ' selected' : '') + '>Pergamin</option></select></label>' +
    '<div class="btnrow"><button class="pill" id="btnExport">Zapisz kopię</button><button class="pill ghost" id="btnImport">Wczytaj kopię</button>' +
    '<button class="pill ghost" id="btnReset" style="color:var(--rose)">Wyczyść wszystko</button><input type="file" id="fileImport" accept="application/json,.json" hidden></div>' +
    '<p class="faint" style="font-size:12px;margin:12px 0 0">Dane zostają w tej przeglądarce. Kopia (plik .json, razem z okładkami) przenosi je na inne urządzenie.</p></div>';
  return h;
}

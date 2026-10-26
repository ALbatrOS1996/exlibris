/* Start i obsługa zdarzeń */
function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  $('#btnTheme').innerHTML = ico(S.settings.theme === 'light' ? 'moon' : 'sun');
  var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = S.settings.theme === 'light' ? '#efe7d7' : '#1c2220';
}
function go(tab) { stopScan(); V.tab = tab; render(); scrollTo({ top: 0, behavior: 'smooth' }); }

document.addEventListener('click', function (e) {
  var t = e.target, el;
  if ((el = t.closest('[data-close]'))) return closeSheet();
  if ((el = t.closest('[data-go]'))) return go(el.dataset.go);
  if ((el = t.closest('[data-add]'))) {
    var b = book(el.closest('[data-id]').dataset.id);
    var res = setProgress(b, b.cur + +el.dataset.add);
    celebrateProgress(b, res, e);
    if (!res.finished) {
      var card = el.closest('.now'), p = pct(b);
      var c = $('.ring .v', card), C = 2 * Math.PI * 25;
      c.style.strokeDashoffset = C * (1 - p / 100); $('.ring span', card).textContent = p + '%';
      $('.ring-wrap small', card).innerHTML = 'strona <b>' + b.cur + '</b><br>z ' + b.pages;
      card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
      clearTimeout(go.t); go.t = setTimeout(function () { if (V.tab === 'shelf' && $('#sheet').hidden) { var x = scrollX, r = $('.reel'), sl = r && r.scrollLeft; render(); if ($('.reel')) $('.reel').scrollLeft = sl; } }, 1600);
    }
    return;
  }
  if ((el = t.closest('[data-open]'))) return detailSheet(el.dataset.open);
  if ((el = t.closest('[data-day]'))) return daySheet(el.dataset.day);
  if ((el = t.closest('[data-lib]'))) { V.libFilter = el.dataset.lib; $$('[data-lib]').forEach(function (x) { x.classList.toggle('on', x === el); }); $('#libList').innerHTML = libRows(); return; }
  if ((el = t.closest('[data-cal]'))) { V.calM += +el.dataset.cal; if (V.calM < 0) { V.calM = 11; V.calY--; } if (V.calM > 11) { V.calM = 0; V.calY++; } return render(); }
  if ((el = t.closest('[data-mon]'))) { V.calM = +el.dataset.mon; return render(); }
  if ((el = t.closest('[data-catf]'))) { var p = el.dataset.catf.split(':'); V.cat[p[0]].f = p[1]; return render(); }
  if ((el = t.closest('[data-cats]'))) { V.cat.czarne.series = el.dataset.cats; return render(); }
  if ((el = t.closest('[data-catadd]'))) {
    var q = el.dataset.catadd.split(':'), nb = addFromCat(q[0], +q[1], 'reading');
    buzz([15, 30, 15]); floater('📖', e.clientX, e.clientY);
    toast('📖', 'Na pulpicie: ' + esc(nb.title), 'Szukam okładki i liczby stron…');
    refreshCatItem(q[0], +q[1]); afterChange();
    return;
  }
  if ((el = t.closest('[data-cattick]'))) {
    var k = el.dataset.cattick.split(':'), list = k[0], i = +k[1], ex = srcBook(list, CATS[list].key(null, i));
    if (ex) { if (ex.status === 'done') return detailSheet(ex.id); finishBook(ex); }
    else ex = addFromCat(list, i, 'done');
    el.closest('.item').classList.add('done');
    buzz([20, 40, 20]); confetti(45);
    toast('📜', 'Przeczytana: ' + esc(ex.title), 'Dodana do kalendarza z dzisiejszą datą – możesz ją zmienić w szczegółach.');
    setTimeout(function () { refreshCatItem(list, i); }, 350);
    afterChange();
    // pasek kraju i licznik
    setTimeout(function () { var y = scrollY; render(); scrollTo(0, y); }, 900);
    return;
  }
  if (t.closest('#fab')) return addSheet();
  if (t.closest('#btnCopyGs')) {
    var done = function () { toast('📋', 'Kod pośrednika skopiowany', 'Wklej go na script.google.com.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(POSREDNIK).then(done, function () { prompt('Skopiuj kod:', POSREDNIK); });
    else prompt('Skopiuj kod:', POSREDNIK);
    return;
  }
  if (t.closest('#btnProxyTest')) {
    S.settings.proxy = $('#setProxy').value.trim(); save();
    if (!S.settings.proxy) return toast('🔌', 'Wklej najpierw adres pośrednika');
    el = t.closest('#btnProxyTest'); el.textContent = '…';
    viaProxy('test=1', 20000).then(function (txt) {
      if (!/"ok":true/.test(txt)) throw new Error();
      return lubimyczytac('Lalka Prus');
    }).then(function (r) {
      toast('✅', 'Pośrednik działa', r.length ? 'lubimyczytac: ' + r.length + ' wyników dla „Lalka Prus”.' : 'Odpowiada, ale lubimyczytac nic nie zwrócił – spróbuj za chwilę.', 4500);
      confetti(40); render();
    }).catch(function () {
      el.textContent = 'Sprawdź';
      toast('⚠️', 'Pośrednik nie odpowiada', 'Sprawdź, czy adres kończy się na /exec i czy dostęp ustawiono na „Każdy”.', 5000);
    });
    return;
  }
  if (t.closest('#btnTheme')) { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; save(); applyTheme(); if (V.tab === 'trophy') render(); return; }
  if (t.closest('#btnExport')) { exportData(); toast('💾', 'Kopia zapisana', 'Plik .json trafił do pobranych.'); return; }
  if (t.closest('#btnImport')) return $('#fileImport').click();
  if (t.closest('#btnReset')) {
    if (confirm('Usunąć wszystkie książki, postępy i ustawienia z tej przeglądarki?') && confirm('Na pewno? Tego nie da się cofnąć bez kopii.')) {
      S = blank(); save(); Object.keys(COVERS).forEach(function (k) { putCover(k, null); }); render(); toast('🧹', 'Wyczyszczono');
    }
    return;
  }
});
/* zwijane kraje w katalogach: treść renderowana dopiero po otwarciu */
document.addEventListener('toggle', function (e) {
  var d = e.target; if (!d.classList || !d.classList.contains('country')) return;
  var key = d.dataset.key, list = key.split('|')[0]; V.cat[list].open[key] = d.open;
  if (d.open && !$('.items', d)) {
    var y = scrollY; render(); scrollTo(0, y);
  }
}, true);
document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.id === 'libQ') { V.libQ = t.value; $('#libList').innerHTML = libRows(); return; }
  if (t.dataset.catq) {
    V.cat[t.dataset.catq].q = t.value;
    clearTimeout(go.q); go.q = setTimeout(function () {
      var pos = t.selectionStart; render();
      var i = document.querySelector('[data-catq]'); i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) {}
    }, 220);
  }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'setDay') { S.settings.dayGoal = Math.max(1, +t.value || 20); save(); toast('🎯', 'Dzienny cel: ' + S.settings.dayGoal + ' stron'); }
  if (t.id === 'setYear') { S.settings.yearGoal = Math.max(1, +t.value || 24); save(); toast('🎯', 'Roczny cel: ' + S.settings.yearGoal + ' książek'); }
  if (t.id === 'setTheme') { S.settings.theme = t.value; save(); applyTheme(); }
  if (t.id === 'setProxy') { S.settings.proxy = t.value.trim(); save(); }
  if (t.id === 'setGkey') { S.settings.gkey = t.value.trim(); save(); toast('🔑', S.settings.gkey ? 'Klucz Google zapisany' : 'Klucz Google usunięty'); render(); }
  if (t.id === 'fileImport' && t.files[0]) {
    var r = new FileReader();
    r.onload = function () {
      if (!confirm('Wczytanie kopii zastąpi obecne dane. Kontynuować?')) return;
      try { importData(r.result).then(function () { applyTheme(); render(); toast('📦', 'Kopia wczytana', S.books.length + ' pozycji'); }); }
      catch (er) { toast('⚠️', 'Nie udało się wczytać', esc(er.message)); }
    };
    r.readAsText(t.files[0]);
  }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#celebrate').hidden) $('#celOk').click(); else closeSheet(); } });

applyTheme();
render();
loadCovers().then(function () { S.rank = S.rank == null ? rankOf(xp()).i : S.rank; render(); });

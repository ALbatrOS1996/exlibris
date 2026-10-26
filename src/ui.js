/* Elementy interfejsu: okładki, pierścienie, arkusz, toasty, konfetti, świętowanie */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function ico(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p || 12); } catch (e) {} }

var SPINE = ['#c9b48a', '#a9c4a0', '#dcaaa2', '#a8bfd1', '#bfb3d4', '#d8c39a', '#b9cfae', '#e0bcb4'];
function hue(s) { var h = 0; s = s || ''; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return SPINE[h % SPINE.length]; }
function coverHtml(b, cls) {
  var src = coverSrc(b);
  if (src) return '<div class="cover ' + (cls || '') + '"><img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="coverFail(this)" data-t="' + esc(b.title) + '" data-a="' + esc(b.author) + '"></div>';
  return phCover(b.title, b.author, cls);
}
function phCover(t, a, cls) {
  return '<div class="cover ph ' + (cls || '') + '" style="--c:' + hue(t + a) + '"><b>' + esc(t) + '</b><i>' + esc((a || '').split(',')[0]) + '</i></div>';
}
function coverFail(img) {
  var box = img.parentNode; if (!box) return;
  var tmp = document.createElement('div'); tmp.innerHTML = phCover(img.dataset.t, img.dataset.a, box.className.replace('cover', ''));
  box.replaceWith(tmp.firstChild);
}
function ring(p, cls, label) {
  var r = cls === 'big' ? 54 : 25, c = 2 * Math.PI * r, s = cls === 'big' ? 128 : 58;
  return '<div class="ring ' + (cls || '') + '"><svg viewBox="0 0 ' + s + ' ' + s + '"><circle class="t" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '"/>' +
    '<circle class="v" cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-off="' + (c * (1 - p / 100)) + '"/></svg>' +
    '<span>' + (label != null ? label : p + '%') + '</span></div>';
}
function bar(p, cls) { return '<div class="bar ' + (cls || '') + '"><i data-w="' + Math.max(0, Math.min(100, p)) + '"></i></div>'; }
/* animuje paski i pierścienie po wstawieniu do DOM */
function animateIn(root) {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      $$('.ring .v', root).forEach(function (c) { c.style.strokeDashoffset = c.dataset.off; });
      $$('.bar > i', root).forEach(function (i) { i.style.width = i.dataset.w + '%'; });
    });
  });
}

/* ---------- arkusz (bottom sheet) ---------- */
var sheetClose = null;
function openSheet(html, onClose) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  sheetClose = onClose || null;
  animateIn($('#sheetBody'));
  return $('#sheetBody');
}
function closeSheet() {
  if ($('#sheet').hidden) return;
  $('#sheet').hidden = true; document.body.style.overflow = '';
  stopScan();
  var f = sheetClose; sheetClose = null; if (f) f();
}

/* ---------- toasty ---------- */
function toast(icon, title, sub, ms) {
  var t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = '<div class="ic">' + icon + '</div><div><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
  $('#toasts').appendChild(t);
  setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, ms || 3200);
}
function floater(text, x, y, cls) {
  var f = document.createElement('div'); f.className = 'floater ' + (cls || ''); f.textContent = text;
  f.style.left = (x - 20) + 'px'; f.style.top = (y - 30) + 'px';
  document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1200);
}

var MAXIMS = [
  ['Festina lente', 'Spiesz się powoli.'], ['Littera scripta manet', 'Słowo zapisane trwa.'], ['Historia magistra vitae', 'Historia nauczycielką życia.'],
  ['Per aspera ad astra', 'Przez trudy do gwiazd.'], ['Nulla dies sine linea', 'Ani dnia bez linijki.'], ['Verba volant, scripta manent', 'Słowa ulatują, pismo zostaje.'],
  ['Dum spiro, spero', 'Póki oddycham, mam nadzieję.'], ['Non scholae, sed vitae discimus', 'Uczymy się dla życia, nie dla szkoły.'],
  ['Gutta cavat lapidem', 'Kropla drąży skałę.'], ['Habent sua fata libelli', 'Książki mają swoje losy.'], ['Tolle, lege', 'Weź i czytaj.'],
  ['Sapere aude', 'Odważ się być mądrym.'], ['Plus ratio quam vis', 'Więcej rozum niż siła.'], ['Repetitio est mater studiorum', 'Powtarzanie jest matką nauki.']
];
function maxim() { var m = MAXIMS[Math.floor(Math.random() * MAXIMS.length)]; return '<i>' + m[0] + '</i> – ' + m[1]; }

/* reakcja na zmianę postępu: liczby nad przyciskiem, kamienie milowe, cel dnia, odznaki, ranga */
function celebrateProgress(b, res, ev) {
  if (!res.delta) return;
  var x = ev && ev.clientX ? ev.clientX : innerWidth / 2, y = ev && ev.clientY ? ev.clientY : innerHeight / 2;
  if (res.delta > 0) { floater('+' + res.delta, x, y); setTimeout(function () { floater('+' + res.delta + ' XP', x + 26, y - 10, 'xp'); }, 160); buzz(10); }
  if (res.finished) { setTimeout(function () { celebrateFinish(b); }, 250); return; }
  [25, 50, 75, 90].forEach(function (m) {
    if (res.before < m && res.after >= m) {
      var t = { 25: ['🌱', 'Ćwierć drogi!'], 50: ['⚖️', 'Półmetek!'], 75: ['🏇', 'Trzy czwarte za tobą!'], 90: ['🏁', 'Ostatnia prosta!'] }[m];
      toast(t[0], t[1] + ' · ' + esc(b.title), maxim()); buzz([20, 40, 20]);
      if (m >= 50) confetti(m === 90 ? 70 : 40);
    }
  });
  var g = S.settings.dayGoal;
  if (g && res.dayBefore < g && res.dayAfter >= g) { setTimeout(function () { toast('🔥', 'Cel dnia osiągnięty!', 'Seria: ' + streak() + ' ' + plural(streak(), 'dzień', 'dni', 'dni') + '. ' + maxim(), 4200); confetti(50); buzz([30, 50, 30]); }, 500); }
  afterChange();
}
var lastRank = null;
function afterChange() {
  newBadges().forEach(function (bd, i) { setTimeout(function () { toast(bd.icon, 'Nowa odznaka: ' + bd.name, bd.desc, 4200); }, 900 + i * 700); });
  var r = rankOf(xp()).i;
  if (S.rank == null) S.rank = r;
  if (r > S.rank) {
    S.rank = r; save();
    setTimeout(function () { toast('🏛️', 'Awans: ' + RANKS[r][1], RANKS[r][2], 5000); confetti(120); buzz([40, 60, 40, 60]); }, 1200);
  } else if (r < S.rank) { S.rank = r; save(); }
  updateRankLine();
}
function updateRankLine() { $('#rankLine').textContent = rankOf(xp()).name; }

function celebrateFinish(b) {
  var nYear = finished().filter(function (x) { return x.end.slice(0, 4) === today().slice(0, 4); }).length;
  var el = $('#celebrate');
  el.innerHTML = '<div class="cel"><div class="wax">FINIS</div>' + coverHtml(b) +
    '<h2>' + esc(b.title) + '</h2><p>Ukończona ' + niceDate(b.end) + '. To ' + nYear + '. książka w tym roku' +
    (S.settings.yearGoal ? ' (cel: ' + S.settings.yearGoal + ')' : '') + '.</p>' +
    '<div class="gains"><span>+' + (60 + (b.src ? 30 : 0)) + ' XP</span><span class="b">' + fmt(b.pages) + ' stron</span>' + (b.src ? '<span class="b">' + CATS[b.src.list].name + ' ✓</span>' : '') + '</div>' +
    '<div class="quote">' + MAXIMS[Math.floor(Math.random() * MAXIMS.length)][0] + '</div>' +
    '<p>Jak oceniasz?</p><div class="stars" id="celStars">' + [1, 2, 3, 4, 5].map(function (n) { return '<button data-n="' + n + '" class="' + (b.rating >= n ? 'on' : '') + '">' + ico('star') + '</button>'; }).join('') + '</div>' +
    '<button class="pill" id="celOk">Dalej</button></div>';
  el.hidden = false;
  confetti(180); buzz([50, 80, 50, 80, 120]);
  $('#celStars').onclick = function (e) {
    var n = e.target.closest('button'); if (!n) return;
    b.rating = +n.dataset.n; save();
    $$('#celStars button').forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= b.rating); });
    n.classList.add('pop'); buzz(8);
  };
  $('#celOk').onclick = function () { el.hidden = true; el.innerHTML = ''; afterChange(); render(); };
}

/* ---------- konfetti (kolory palety) ---------- */
var CONF = null;
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = $('#confetti'), ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var cols = ['#a9c4a0', '#dcc08a', '#dcaaa2', '#a8bfd1', '#bfb3d4', '#efe6d6'];
  var parts = (CONF && CONF.parts) || [];
  for (var i = 0; i < n; i++) parts.push({
    x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .42, vx: (Math.random() - .5) * 13, vy: -Math.random() * 13 - 4,
    r: Math.random() * 6 + 4, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - .5) * .4, life: 0, sh: Math.random() < .3
  });
  if (CONF) return; CONF = { parts: parts };
  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = CONF.parts = CONF.parts.filter(function (p) { return p.life < 160 && p.y < innerHeight + 30; });
    parts.forEach(function (p) {
      p.life++; p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - p.life / 160); ctx.fillStyle = p.c;
      if (p.sh) { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, 7); ctx.fill(); } else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    });
    if (parts.length) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, innerWidth, innerHeight); CONF = null; }
  })();
}

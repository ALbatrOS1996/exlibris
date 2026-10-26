/**
 * Ex Libris – pośrednik wyszukiwania (Google Apps Script, darmowy, działa na Twoim koncie Google).
 * Aplikacja w przeglądarce nie może sama pytać lubimyczytac.pl, katalogu Biblioteki Narodowej
 * ani rejestru e-ISBN – ten skrypt robi to za nią i odsyła krótką odpowiedź.
 *
 *   ?lc=<fraza>        wyszukiwanie w lubimyczytac.pl (tytuł, autor, okładka, strony, ISBN, rok)
 *   ?url=<adres>       surowa odpowiedź z data.bn.org.pl lub e-isbn.pl
 *   ?test=1            sprawdzenie, czy pośrednik działa
 */
var DOZWOLONE = ['data.bn.org.pl', 'e-isbn.pl', 'www.e-isbn.pl'];
var LC = 'https://lubimyczytac.pl';
var UA = { 'User-Agent': 'Mozilla/5.0 (Ex Libris; prywatny dziennik lektur)' };

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.test) return tekst('{"ok":true,"wersja":2}');
  if (p.lc) return pamiec('lc:' + p.lc, function () { return JSON.stringify(szukajLC(p.lc)); });
  var url = p.url || '';
  var host = (url.match(/^https:\/\/([^\/?#]+)/) || [])[1];
  if (DOZWOLONE.indexOf(host) < 0) return tekst('{"error":"niedozwolony adres"}');
  return pamiec(url, function () {
    var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    return r.getResponseCode() === 200 ? r.getContentText('UTF-8') : '';
  });
}

/* wyniki z pamięci podręcznej (6 h), żeby nie męczyć serwisów tymi samymi zapytaniami */
function pamiec(klucz, fn) {
  var cache = CacheService.getScriptCache();
  var k = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, klucz, Utilities.Charset.UTF_8));
  var z = cache.get(k);
  if (z) return tekst(z);
  var body = fn();
  if (body && body.length < 95000) cache.put(k, body, 21600);
  return tekst(body || '{"error":"brak odpowiedzi"}');
}
function tekst(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); }

/* ---------- lubimyczytac.pl ---------- */
function szukajLC(fraza) {
  var r = UrlFetchApp.fetch(LC + '/szukaj/ksiazki?phrase=' + encodeURIComponent(fraza), { muteHttpExceptions: true, headers: UA });
  if (r.getResponseCode() !== 200) return { error: 'lubimyczytac ' + r.getResponseCode(), items: [] };
  var items = parsujWyniki(r.getContentText('UTF-8')).slice(0, 8);
  // szczegóły (strony, ISBN, data, duża okładka) dla pierwszych 6 – równolegle
  var top = items.slice(0, 6);
  var odp = UrlFetchApp.fetchAll(top.map(function (it) { return { url: LC + it.path, muteHttpExceptions: true, headers: UA }; }));
  odp.forEach(function (o, i) { if (o.getResponseCode() === 200) uzupelnij(top[i], parsujKsiazke(o.getContentText('UTF-8'))); });
  return { items: items };
}
function parsujWyniki(html) {
  var out = [];
  html.split('class="book-card book-card--l').slice(1).forEach(function (blok) {
    var link = blok.match(/href="(\/ksiazka\/\d+\/[^"#]+)"/) || blok.match(/action="(\/ksiazka\/\d+\/[^"#]+)"/);
    var tyt = blok.match(/class="book-card__title"[^>]*title="([^"]*)"/) || blok.match(/class="book-card__title"[^>]*>([^<]*)</);
    if (!link || !tyt) return;
    var aut = [], re = /book-card__author">([\s\S]*?)<\/div>/, a = blok.match(re);
    if (a) a[1].replace(/<a[^>]*>([^<]*)<\/a>/g, function (_, n) { aut.push(encje(n).trim()); });
    var img = blok.match(/<img[^>]+src="(https:\/\/s\.lubimyczytac\.pl\/upload\/books\/[^"]+)"/);
    out.push({ path: link[1], title: encje(tyt[1]).trim(), author: aut.join(', '),
      cover: img && !/default-book/.test(img[1]) ? img[1].replace(/-\d+x\d+\.jpg$/, '-352x500.jpg') : '', pages: 0, isbn: '', year: '' });
  });
  return out;
}
function parsujKsiazke(html) {
  var res = {}, bloki = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  bloki.forEach(function (b) {
    try {
      var j = JSON.parse(b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
      if (j['@type'] === 'Book') res = j;
    } catch (e) {}
  });
  var pierwsze = html.match(/Data 1\. wyd\. pol\.:<\/dt>\s*<dd>\s*(\d{4})/);
  return { pages: +res.numberOfPages || 0, isbn: res.isbn || '', year: pierwsze ? pierwsze[1] : String(res.datePublished || '').slice(0, 4),
    cover: res.image || '', series: res.isPartOfSeries ? res.isPartOfSeries.name : '' };
}
function uzupelnij(it, d) {
  if (d.pages) it.pages = d.pages;
  if (d.isbn && !/^0+[-0]*$/.test(d.isbn)) it.isbn = d.isbn;
  if (d.year) it.year = d.year;
  if (d.cover) it.cover = d.cover;
  if (/default-book/.test(it.cover)) it.cover = '';
  if (d.series) it.series = d.series;
}
function encje(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); });
}

/* uruchom raz w edytorze (▶ Uruchom → test), żeby nadać skryptowi uprawnienia */
function test() { Logger.log(JSON.stringify(szukajLC('Gottland')).slice(0, 600)); }

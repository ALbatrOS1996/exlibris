# Ex Libris – dziennik lektur

- **Półka** – aktualnie czytane z postępem (+5/+10/+25, numer strony), cel dnia, seria dni, ostatnio ukończone, cała biblioteka.
- **Dodawanie** – wyszukiwanie po tytule lub ISBN, skaner kodu (Chrome/Android), okładka: wklejenie Ctrl+V, plik, przeciągnięcie, URL.
  Źródła: Google Books (opcjonalnie własny klucz), Open Library, a przez własny pośrednik `src/posrednik.gs` (Google Apps Script) także lubimyczytac.pl, katalog Biblioteki Narodowej i e-ISBN. Instrukcja wdrożenia jest w aplikacji: Trofea → Źródła wyszukiwania.
- **Kalendarz** – miesiąc z okładkami w dniach ukończenia, dni czytania, podsumowanie roku.
- **Kanon** (374 pozycje, 46 krajów) i **Czarne** (517 tytułów literatury faktu o Europie) – „Czytam” dodaje na półkę, kółko oznacza jako przeczytaną.
- **Trofea** – rangi (XP), 24 odznaki, ustawienia, kopia zapasowa .json.

Budowanie: `python build.py` → `Ex_libris.html` (jeden plik) i `docs/` (PWA na GitHub Pages).
Dane list: `src/kanon.js`, `src/czarne.js` (wygenerowane z PDF-ów).

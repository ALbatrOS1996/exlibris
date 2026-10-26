# Ex Libris – dziennik lektur

- **Półka** – aktualnie czytane z postępem (+5/+10/+25, numer strony), cel dnia, seria dni, ostatnio ukończone, cała biblioteka.
- **Dodawanie** – wyszukiwanie po tytule lub ISBN (Google Books + Open Library), skaner kodu (Chrome/Android), okładka: wklejenie Ctrl+V, plik, przeciągnięcie, URL.
- **Kalendarz** – miesiąc z okładkami w dniach ukończenia, dni czytania, podsumowanie roku.
- **Kanon** (374 pozycje, 46 krajów) i **Czarne** (517 tytułów literatury faktu o Europie) – „Czytam” dodaje na półkę, kółko oznacza jako przeczytaną.
- **Trofea** – rangi (XP), 24 odznaki, ustawienia, kopia zapasowa .json.

Budowanie: `python build.py` → `Ex_libris.html` (jeden plik) i `docs/` (PWA na GitHub Pages).
Dane list: `src/kanon.js`, `src/czarne.js` (wygenerowane z PDF-ów).

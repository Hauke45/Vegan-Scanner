# Vegan-Check

Eine einfache, kostenlose Web-App zum Scannen und Prüfen von Produktzutaten. Sie verwendet die Open Food Facts API und die Open-Source-Bibliothek html5-qrcode.

## Dateien

- `index.html` enthält die Oberfläche.
- `style.css` enthält das Layout und die Darstellung für Handy und Computer.
- `script.js` enthält Scanner, Produktsuche und die einfache Zutaten-Regelliste.

## Lokal in Visual Studio Code testen

1. Öffne in VS Code den Ordner, in dem `index.html`, `style.css` und `script.js` liegen.
2. Installiere im Erweiterungsbereich die kostenlose Erweiterung **Live Server** (Ritwick Dey), falls sie noch nicht installiert ist.
3. Rechtsklicke auf `index.html` und wähle **Open with Live Server**. Die App öffnet sich unter einer lokalen Adresse, meist `http://127.0.0.1:5500`.
4. Teste die manuelle Zutatenprüfung zum Beispiel mit `Zutaten: Haferflocken, Zucker` (Regelergebnis VEGAN), `Zutaten: Milchpulver, Zucker` (NICHT VEGAN) und `Zutaten: Haferflocken, E471` (UNKLAR). Dies sind nur Testeingaben, keine Produktdaten.
5. Gib einen vorhandenen Produkt-Barcode ein, um die Datenbanksuche zu testen. Ergebnisse hängen davon ab, ob das Produkt in Open Food Facts eingetragen ist.
6. Für den Kameratest braucht dein Browser Kamerazugriff. `localhost` ist dafür eine sichere lokale Verbindung. Ein Zugriff über eine normale LAN-IP-Adresse ist in der Regel nicht ausreichend.

Die Scanner-Bibliothek wird von unpkg geladen; die Produktsuche benötigt Internetzugriff.

## Per HTTPS auf dem Galaxy A34 nutzen

Eine einfache kostenlose Möglichkeit zum Veröffentlichen ist **GitHub Pages**:

1. Melde dich bei GitHub an und erstelle ein neues Repository. Bei einem kostenlosen GitHub-Konto muss das Repository für GitHub Pages gegebenenfalls öffentlich sein.
2. Lade `index.html`, `style.css`, `script.js` und optional diese `README.md` in das Stammverzeichnis des Repositorys hoch.
3. Öffne im Repository **Settings → Pages**. Wähle unter **Build and deployment** die Bereitstellung aus dem Branch `main` und dem Ordner `/(root)` und speichere.
4. Warte, bis GitHub Pages die Website veröffentlicht hat. Öffne die dort angezeigte `https://…github.io/…`-Adresse zuerst auf deinem Computer und anschließend auf dem Galaxy A34 in Chrome.
5. Erlaube den Kamerazugriff in Chrome. Zum Hinzufügen auf den Startbildschirm öffne das Chrome-Menü (⋮) und wähle **Zum Startbildschirm hinzufügen** oder **App installieren**, falls Chrome diese Option anbietet.

Nach Änderungen musst du die aktualisierten Dateien erneut in das Repository hochladen; die Website wird anschließend neu veröffentlicht. Die App benötigt weiterhin Internet für den Scanner-CDN und Open Food Facts.

## Grenzen der Einschätzung

„VEGAN“ bedeutet hier nur, dass in den eingegebenen bzw. von Open Food Facts gelieferten Zutaten keine Stoffe aus der eingebauten Liste erkannt wurden. „UNKLAR“ wird unter anderem bei fehlenden Zutatenangaben und Zutaten mit möglicherweise unterschiedlicher Herkunft angezeigt. Die Regelliste und die gemeinschaftlich gepflegten Produktdaten sind nicht vollständig und garantieren keinen Veganismus. Prüfe im Zweifel die Verpackung oder frage beim Hersteller nach.

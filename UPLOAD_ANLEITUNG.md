# 📤 UPLOAD-ANLEITUNG FÜR SEOLLERHAUS.AT

## WICHTIG: ORDNERSTRUKTUR AUF DEM SERVER

Die Dateien müssen **genau** in dieser Struktur hochgeladen werden:

```
/public_html/kassa/
├── index.html          ← Im Hauptordner
├── app.js              ← Im Hauptordner
├── styles.css          ← Im Hauptordner
├── sw.js               ← Im Hauptordner
├── manifest.json       ← Im Hauptordner
└── assets/             ← Unterordner erstellen!
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## SCHRITT-FÜR-SCHRITT UPLOAD

### Option 1: Mit FileZilla (empfohlen)

**1. Verbinden Sie sich mit Ihrem Server**
   - Host: ftp.seollerhaus.at (oder Ihre FTP-Adresse)
   - Benutzername: Ihr FTP-Username
   - Passwort: Ihr FTP-Passwort
   - Port: 21

**2. Navigieren Sie zu `/public_html/`**

**3. Erstellen Sie den Ordner `kassa`**
   - Rechtsklick → "Verzeichnis erstellen"
   - Name: `kassa`

**4. Öffnen Sie den `kassa` Ordner**

**5. Laden Sie die 5 Hauptdateien hoch**
   - Wählen Sie alle 5 Dateien aus:
     - index.html
     - app.js
     - styles.css
     - sw.js
     - manifest.json
   - Drag & Drop in den `kassa` Ordner
   - Warten bis Upload fertig ist

**6. Erstellen Sie den Unterordner `assets`**
   - Im `kassa` Ordner: Rechtsklick → "Verzeichnis erstellen"
   - Name: `assets`

**7. Öffnen Sie den `assets` Ordner**

**8. Laden Sie alle 8 Icons hoch**
   - Wählen Sie alle Icons aus (icon-*.png)
   - Drag & Drop in den `assets` Ordner
   - Warten bis Upload fertig ist

**9. Fertig!**
   - Ihre App ist jetzt erreichbar unter: `https://seollerhaus.at/kassa/`

---

### Option 2: Alle Dateien in einem Schritt (ZIP-Upload)

Wenn Ihr Hosting ZIP-Upload unterstützt:

**1. Lokal einen Ordner `kassa` erstellen**

**2. Struktur nachbauen:**
```
kassa/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.json
└── assets/
    └── (alle 8 Icons hier)
```

**3. `kassa` Ordner als ZIP komprimieren**

**4. ZIP hochladen nach `/public_html/`**

**5. Auf dem Server entpacken**

**6. Fertig!**

---

## ✅ CHECKLISTE NACH UPLOAD

Nach dem Upload prüfen Sie:

- [ ] URL öffnen: `https://seollerhaus.at/kassa/`
- [ ] Login-Screen wird angezeigt
- [ ] Browser-Konsole öffnen (F12) → Keine Fehler
- [ ] Manifest geladen: DevTools → Application → Manifest
- [ ] Service Worker registriert: DevTools → Application → Service Workers
- [ ] Icons sichtbar: DevTools → Application → Manifest → Icons

---

## 🔧 TROUBLESHOOTING

### Problem: "404 Not Found"
→ Prüfen Sie die Ordnerstruktur
→ Alle Dateien im richtigen Ordner?
→ Groß-/Kleinschreibung beachten!

### Problem: Icons werden nicht angezeigt
→ `assets` Ordner existiert?
→ Alle 8 Icons hochgeladen?
→ Richtige Dateinamen? (icon-72.png, nicht Icon-72.PNG)

### Problem: Service Worker Fehler
→ HTTPS aktiviert? (Pflicht für PWA!)
→ `sw.js` im Hauptordner?
→ Cache leeren: Strg + Shift + R

### Problem: Manifest-Fehler
→ `manifest.json` im Hauptordner?
→ Pfade in manifest.json stimmen?

---

## 📝 WICHTIGE HINWEISE

**HTTPS ist Pflicht!**
- Die PWA funktioniert NUR mit HTTPS
- URL MUSS mit `https://` beginnen
- Sonst: Service Worker wird nicht registriert

**Dateinamen beachten:**
- Genau so wie angegeben (Groß-/Kleinschreibung!)
- Keine Leerzeichen
- Keine Umlaute

**Browser-Cache:**
- Nach Änderungen: Cache leeren
- Strg + Shift + R (Windows)
- Cmd + Shift + R (Mac)

---

## 🎯 FINALE URL

Nach erfolgreichem Upload ist Ihre App erreichbar unter:

**https://seollerhaus.at/kassa/**

Testen Sie:
1. Desktop-Browser öffnen
2. Smartphone-Browser öffnen
3. "Zum Homescreen hinzufügen" testen

---

## 📞 SUPPORT

Bei Problemen:
- Prüfen Sie die Browser-Konsole (F12)
- Screenshots von Fehlermeldungen machen
- Ordnerstruktur nochmal prüfen

Viel Erfolg! 🚀

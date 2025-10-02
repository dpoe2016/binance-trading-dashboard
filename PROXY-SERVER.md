# Proxy Server - CORS-Lösung

## 🤔 Warum ein Proxy Server?

Binance API erlaubt **keine direkten Calls aus dem Browser** aus Sicherheitsgründen (CORS-Policy).

Wenn du versuchst, direkt von Angular aus die Binance API aufzurufen, erhältst du diesen Fehler:

```
Access to XMLHttpRequest at 'https://testnet.binance.vision/api/v3/...'
from origin 'http://localhost:4200' has been blocked by CORS policy
```

**Lösung:** Der Proxy Server läuft lokal auf deinem Computer und leitet die Requests weiter.

```
Angular App (Browser)  →  Proxy Server (localhost:3000)  →  Binance API
                 ✅ Erlaubt              ✅ Erlaubt
```

---

## 🚀 Proxy Server starten

### Option 1: Manuell in 2 Terminals

**Terminal 1 - Proxy Server:**
```bash
npm run proxy
```

**Terminal 2 - Angular App:**
```bash
npm start
```

### Option 2: Automatisch mit einem Befehl (experimentell)

```bash
npm run start:full
```

Dies startet beide Server gleichzeitig (funktioniert möglicherweise nicht auf allen Systemen).

---

## ⚙️ Konfiguration

Die Proxy-Konfiguration erfolgt über die `.env` Datei:

```bash
# Proxy aktivieren
USE_PROXY=true

# Proxy URL (wo der Proxy Server läuft)
PROXY_URL=http://localhost:3000

# Port für den Proxy Server
PROXY_PORT=3000
```

---

## 📊 Wie es funktioniert

1. **Angular App** sendet Request an Proxy: `http://localhost:3000/api/v3/account`
2. **Proxy Server** fügt Authentifizierung hinzu (API Key + Signature)
3. **Proxy Server** sendet Request an Binance: `https://testnet.binance.vision/api/v3/account`
4. **Binance API** antwortet an Proxy Server
5. **Proxy Server** leitet Antwort an Angular App weiter

Der Proxy Server liest automatisch die API Keys aus der `.env` Datei.

---

## ✅ Erfolgskontrolle

### Wenn der Proxy Server erfolgreich läuft, siehst du:

```
============================================================
🚀 Binance API Proxy Server
============================================================
📍 Server running on: http://localhost:3000
📋 Trading Mode: TESTNET
🔗 Binance API: https://testnet.binance.vision
🔑 API Key: zw0z8puDWO...

✅ Ready to proxy requests from Angular app

ℹ️  Configure Angular app to use: http://localhost:3000
============================================================
```

### Wenn Requests durchgehen, siehst du:

```
📡 Proxying request: GET /api/v3/account?timestamp=1759427103659&signature=81ac...
📡 Proxying request: GET /fapi/v2/positionRisk?timestamp=1759427103665&signature=1903...
📡 Proxying request: GET /api/v3/openOrders?timestamp=1759427103668&signature=a8dc...
```

---

## 🔧 Troubleshooting

### Problem 1: Proxy Server startet nicht
**Fehler:** `Error: listen EADDRINUSE: address already in use :::3000`

**Lösung:** Port 3000 wird bereits verwendet
```bash
# Finde den Prozess, der Port 3000 verwendet
lsof -i :3000

# Beende den Prozess
kill -9 <PID>

# Oder ändere den Port in .env:
PROXY_PORT=3001
PROXY_URL=http://localhost:3001
```

### Problem 2: Angular App verbindet sich nicht mit Proxy
**Problem:** Requests gehen immer noch direkt an Binance

**Lösung:**
1. Überprüfe `.env` Datei: `USE_PROXY=true` muss gesetzt sein
2. Generiere Umgebungsdateien neu: `npm run generate-env`
3. Starte Angular App neu: `npm start`

### Problem 3: "API Secret not configured"
**Problem:** Proxy Server kann Signatur nicht generieren

**Lösung:**
1. Stelle sicher, dass API Keys in `.env` korrekt sind
2. Für Testnet: `BINANCE_TESTNET_API_KEY` und `BINANCE_TESTNET_API_SECRET`
3. Starte Proxy Server neu: `npm run proxy`

### Problem 4: WebSocket-Fehler bleiben
**Hinweis:** WebSocket-Verbindungen (für Live-Charts) können nicht über den HTTP-Proxy laufen.

**Workaround:**
- Nutze öffentliche Binance WebSocket Streams (funktionieren ohne API Key)
- Diese sollten ohne CORS-Probleme funktionieren

---

## 🔐 Sicherheit

**Wichtig:**
- Der Proxy Server ist **NUR für Development** gedacht
- **NIEMALS** den Proxy Server öffentlich zugänglich machen
- Läuft nur auf `localhost` (127.0.0.1)
- Kann nicht von anderen Computern erreicht werden

**Für Produktion:**
- Verwende ein richtiges Backend (Node.js, Python, etc.)
- Speichere API Keys sicher (Environment Variables, Secrets Manager)
- Implementiere Rate Limiting und Authentifizierung

---

## 📝 Quellcode

Der Proxy Server befindet sich in: `server/proxy-server.js`

Hauptfunktionen:
- Liest .env Datei für Konfiguration
- Generiert HMAC SHA256 Signaturen
- Fügt X-MBX-APIKEY Header hinzu
- Leitet Requests an Binance weiter
- Aktiviert CORS für lokale Entwicklung

---

## 🎯 Alternative: CORS Browser Extension

**Nur für Tests geeignet:**

Wenn du den Proxy Server nicht verwenden möchtest, kannst du temporär eine Browser-Extension nutzen:

1. Installiere "CORS Unblock" oder "Allow CORS" Extension
2. Aktiviere die Extension
3. Setze `USE_PROXY=false` in `.env`
4. Starte App neu: `npm start`

⚠️ **Warnung:** Diese Lösung funktioniert nur im Browser und ist unsicher für Produktion!

---

## 📚 Weitere Ressourcen

- [Binance API Dokumentation](https://binance-docs.github.io/apidocs/spot/en/)
- [CORS Explained (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [API Authentication Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

# ⚡ Quick Start Guide

## 🚀 In 3 Schritten zum Testnet-Modus

### Schritt 1: Testnet API Keys erstellen

1. Gehe zu: **https://testnet.binance.vision/**
2. Registriere einen Account (keine echten Daten nötig)
3. Klicke auf **"Generate HMAC_SHA256 Key"**
4. Kopiere deinen **API Key** und **Secret Key**

### Schritt 2: API Keys eintragen

Öffne die Datei: **`src/env-config.js`**

Ändere diese Zeilen:

```javascript
window.ENV_CONFIG = {
  // ✅ ÄNDERE DIES ZU 'testnet':
  TRADING_MODE: 'testnet',  // ← von 'demo' zu 'testnet' ändern

  // ✅ TRAGE DEINE TESTNET KEYS EIN:
  BINANCE_TESTNET_API_KEY: 'dein_testnet_api_key_hier',
  BINANCE_TESTNET_API_SECRET: 'dein_testnet_secret_hier'
};
```

**Beispiel mit echten Keys:**
```javascript
window.ENV_CONFIG = {
  TRADING_MODE: 'testnet',

  BINANCE_TESTNET_API_KEY: 'abc123xyz789example',
  BINANCE_TESTNET_API_SECRET: 'def456uvw012secretexample'
};
```

### Schritt 3: App starten

```bash
ng serve
```

Öffne: **http://localhost:4200**

---

## ✅ Erfolgskontrolle

### In der Browser-Console solltest du sehen:

```
🧪 Testnet mode activated - using real Binance Testnet API
✅ Loaded X account balances from testnet API
✅ Loaded X positions from testnet API
✅ Loaded X open orders from testnet API
```

### ❌ Falls du stattdessen siehst:

```
🎮 Demo mode activated - using mock data
```

**→ Du hast `TRADING_MODE` noch nicht auf `'testnet'` geändert!**

---

## 📋 Checkliste

- [ ] Testnet Account erstellt auf https://testnet.binance.vision/
- [ ] API Keys generiert
- [ ] `src/env-config.js` geöffnet
- [ ] `TRADING_MODE: 'testnet'` eingetragen
- [ ] API Keys eingetragen (ohne Anführungszeichen im String)
- [ ] App mit `ng serve` gestartet
- [ ] Browser-Console überprüft (F12)

---

## 🔧 Häufige Fehler

### 1. App zeigt noch Demo Mode
**Problem:** `TRADING_MODE` steht noch auf `'demo'`

**Lösung:**
```javascript
TRADING_MODE: 'testnet',  // ✅ Richtig
// NICHT:
TRADING_MODE: 'demo',     // ❌ Falsch
```

### 2. API Keys funktionieren nicht
**Problem:** Keys falsch kopiert oder Leerzeichen

**Lösung:**
```javascript
// ✅ Richtig - Keys in Anführungszeichen:
BINANCE_TESTNET_API_KEY: 'abc123xyz',

// ❌ Falsch - Leerzeichen oder fehlerhafte Zeichen:
BINANCE_TESTNET_API_KEY: 'abc123xyz ',  // Leerzeichen am Ende
BINANCE_TESTNET_API_KEY: abc123xyz,     // Fehlende Anführungszeichen
```

### 3. App muss neu geladen werden
**Problem:** Änderungen in `env-config.js` werden nicht übernommen

**Lösung:**
1. Browser **komplett neu laden** (Strg+Shift+R / Cmd+Shift+R)
2. Oder: Server stoppen und neu starten:
   ```bash
   Strg+C  # Server stoppen
   ng serve  # Neu starten
   ```

### 4. CORS-Fehler
**Problem:** Browser blockiert API-Calls

**Temporäre Lösung für Development:**
1. Installiere Chrome Extension: "CORS Unblock"
2. Aktiviere die Extension
3. Lade die Seite neu

**Dauerhafte Lösung:**
- Backend-Proxy verwenden (siehe API-SETUP.md)

---

## 🎯 Nächste Schritte

Nach erfolgreichem Testnet-Setup:

1. **Teste Strategien** im Strategien-Tab
2. **Schaue Charts** im Charts-Tab
3. **Teste Trading** mit Test-USDT

Später für **Live-Trading**:
- Ändere `TRADING_MODE: 'live'`
- Trage Live API Keys ein
- ⚠️ **NUR nach ausgiebigen Tests!**

---

## 📚 Weitere Hilfe

- **Ausführliche API-Anleitung:** [API-SETUP.md](API-SETUP.md)
- **Vollständige Dokumentation:** [README.md](README.md)
- **Setup-Guide:** [SETUP.md](SETUP.md)

---

## ⚠️ Wichtig

- **.env Datei wird NICHT verwendet** - nur `src/env-config.js` zählt!
- **Testnet Keys ≠ Live Keys** - nicht verwechseln!
- **Git committed diese Datei** - Keine echten Keys eintragen wenn du pushen willst!

Für Produktion: Verwende Environment Variables oder Backend-Proxy!

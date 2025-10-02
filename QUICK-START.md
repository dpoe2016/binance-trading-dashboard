# ⚡ Quick Start Guide

## 🚀 In 3 Schritten zum Testnet-Modus

### Schritt 1: Testnet API Keys erstellen

1. Gehe zu: **https://testnet.binance.vision/**
2. Registriere einen Account (keine echten Daten nötig)
3. Klicke auf **"Generate HMAC_SHA256 Key"**
4. Kopiere deinen **API Key** und **Secret Key**

### Schritt 2: .env Datei erstellen und ausfüllen

1. **Kopiere die Beispieldatei:**
   ```bash
   cp .env.example .env
   ```

2. **Öffne die .env Datei** und ändere diese Zeilen:
   ```bash
   # Ändere den Trading Mode:
   TRADING_MODE=testnet

   # Trage deine Testnet Keys ein:
   BINANCE_TESTNET_API_KEY=dein_testnet_api_key_hier
   BINANCE_TESTNET_API_SECRET=dein_testnet_secret_hier
   ```

**Beispiel mit echten Keys:**
```bash
TRADING_MODE=testnet

BINANCE_TESTNET_API_KEY=abc123xyz789example
BINANCE_TESTNET_API_SECRET=def456uvw012secretexample
```

### Schritt 3: Proxy Server starten (für echte API-Calls)

Um CORS-Probleme zu vermeiden, verwende den Proxy Server:

**Terminal 1 - Proxy Server:**
```bash
npm run proxy
```

**Terminal 2 - Angular App:**
```bash
npm start
```

Das war's! Die App liest automatisch deine .env Datei und generiert die nötigen Konfigurationsdateien.

Öffne: **http://localhost:4200**

---

## ✅ Erfolgskontrolle

### Beim Starten der App solltest du in der Konsole sehen:

```
✅ Loaded .env file
📋 Trading Mode: testnet
✅ Generated src/environments/environment.ts
✅ Generated src/environments/environment.prod.ts
🧪 Running in TESTNET mode
```

### In der Browser-Console (F12) solltest du sehen:

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

**→ Du hast `TRADING_MODE` in der .env Datei noch nicht auf `testnet` geändert!**

---

## 📋 Checkliste

- [ ] Testnet Account erstellt auf https://testnet.binance.vision/
- [ ] API Keys generiert
- [ ] `.env.example` zu `.env` kopiert: `cp .env.example .env`
- [ ] `.env` Datei geöffnet
- [ ] `TRADING_MODE=testnet` eingetragen
- [ ] API Keys eingetragen (ohne Anführungszeichen!)
- [ ] App mit `npm start` gestartet
- [ ] Konsole beim Start überprüft (sollte "Testnet mode" zeigen)
- [ ] Browser-Console überprüft (F12)

---

## 🔧 Häufige Fehler

### 1. App zeigt noch Demo Mode
**Problem:** `TRADING_MODE` steht noch auf `demo` in der .env Datei

**Lösung:**
```bash
# In .env Datei:
TRADING_MODE=testnet  # ✅ Richtig
# NICHT:
TRADING_MODE=demo     # ❌ Falsch
```

### 2. .env Datei existiert nicht
**Problem:** Du hast vergessen, .env.example zu .env zu kopieren

**Lösung:**
```bash
cp .env.example .env
```

### 3. API Keys funktionieren nicht
**Problem:** Keys falsch kopiert oder Leerzeichen

**Lösung:**
```bash
# ✅ Richtig - Keys OHNE Anführungszeichen in .env:
BINANCE_TESTNET_API_KEY=abc123xyz
BINANCE_TESTNET_API_SECRET=def456uvw

# ❌ Falsch - Leerzeichen oder Anführungszeichen:
BINANCE_TESTNET_API_KEY="abc123xyz"  # Keine Anführungszeichen!
BINANCE_TESTNET_API_KEY=abc123xyz   # Kein Leerzeichen am Ende!
```

### 4. Änderungen in .env werden nicht übernommen
**Problem:** Server muss neu gestartet werden

**Lösung:**
1. Server stoppen (Strg+C)
2. Server neu starten:
   ```bash
   npm start
   ```
3. Die .env Datei wird automatisch beim Start gelesen

**Alternativ:** Nur die Umgebungsdateien neu generieren:
```bash
npm run generate-env
```

### 5. CORS-Fehler
**Problem:** Browser blockiert API-Calls

**Lösung:** Verwende den Proxy Server!
1. Stelle sicher, dass `USE_PROXY=true` in der .env Datei steht
2. Starte den Proxy Server in einem separaten Terminal:
   ```bash
   npm run proxy
   ```
3. Starte die Angular App:
   ```bash
   npm start
   ```

Der Proxy Server leitet die Requests an Binance weiter und vermeidet CORS-Probleme.

---

## 🎯 Nächste Schritte

Nach erfolgreichem Testnet-Setup:

1. **Teste Strategien** im Strategien-Tab
2. **Schaue Charts** im Charts-Tab
3. **Teste Trading** mit Test-USDT

Später für **Live-Trading**:
1. Ändere in .env: `TRADING_MODE=live`
2. Trage Live API Keys ein
3. Server neu starten: `npm start`
4. ⚠️ **NUR nach ausgiebigen Tests!**

---

## 📚 Weitere Hilfe

- **Ausführliche API-Anleitung:** [API-SETUP.md](API-SETUP.md)
- **Vollständige Dokumentation:** [README.md](README.md)
- **Setup-Guide:** [SETUP.md](SETUP.md)

---

## 💡 Wichtige Hinweise

- **Die .env Datei wird NICHT in Git committed** (steht in .gitignore)
- **Testnet Keys ≠ Live Keys** - nicht verwechseln!
- **Nach Änderungen in .env:** Server neu starten!
- **Automatische Generierung:** `npm start` führt automatisch `npm run generate-env` aus
- **Manuelle Generierung möglich:** `npm run generate-env`

---

## 🔍 Wie es funktioniert

1. Du bearbeitest die **.env** Datei (im Projektroot)
2. Beim Start führt `npm start` automatisch `npm run generate-env` aus
3. Das Script liest die .env Datei und erstellt **src/environments/environment.ts**
4. Die Angular App importiert die Konfiguration aus dieser generierten Datei
5. Der BinanceService nutzt die Konfiguration für API-Calls

**Wichtig:** Die Dateien in `src/environments/` sind **auto-generiert** und sollten nicht manuell bearbeitet werden!

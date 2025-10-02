# API Setup Guide - Real Data Integration

## 🎯 Trading Modi

Das System unterstützt 3 Modi:

### 1. 🎮 Demo Mode (Standard)
- **Keine API Keys nötig**
- Zeigt Mock-Daten
- Perfekt zum Testen der UI
- Keine echten Trades

### 2. 🧪 Testnet Mode
- **Binance Testnet API Keys benötigt**
- Echte API-Integration
- Test-USDT (kein echtes Geld)
- **Zeigt nur echte Daten vom Testnet**

### 3. 💰 Live Mode
- **Binance Live API Keys benötigt**
- Echte API-Integration
- Echtes Geld
- **Zeigt nur echte Daten vom Live-Account**

---

## 🔧 Konfiguration für echte Daten

### Testnet Mode aktivieren:

1. **Testnet Account erstellen:**
   - Gehe zu: https://testnet.binance.vision/
   - Registriere einen Test-Account

2. **API Keys generieren:**
   - Navigiere zu "API Management"
   - Erstelle neuen API Key
   - Kopiere API Key und Secret

3. **Konfiguration in `src/env-config.js`:**
   ```javascript
   window.ENV_CONFIG = {
     TRADING_MODE: 'testnet',  // ← Auf testnet ändern

     BINANCE_TESTNET_API_KEY: 'dein_testnet_api_key_hier',
     BINANCE_TESTNET_API_SECRET: 'dein_testnet_secret_hier'
   };
   ```

4. **App neu starten:**
   ```bash
   ng serve
   ```

5. **Überprüfung:**
   - Öffne Browser Console
   - Du solltest sehen: `🧪 Testnet mode activated`
   - Beim Laden des Dashboards: `✅ Loaded X account balances from testnet API`

---

## 📊 Was wird geladen?

### Im Testnet/Live Modus:

| Datentyp | API Endpoint | Authentifizierung |
|----------|--------------|-------------------|
| Account Balances | `/api/v3/account` | ✅ Required |
| Open Orders | `/api/v3/openOrders` | ✅ Required |
| Futures Positions | `/fapi/v2/positionRisk` | ✅ Required |
| Market Data (Charts) | `/api/v3/klines` | ❌ Public |

### Im Demo Modus:
- Alle Daten sind Mock-Daten
- Keine API-Calls
- Nur zur UI-Demonstration

---

## 🔐 API Berechtigungen

Für **Testnet und Live** benötigst du:

```
✅ Enable Reading
✅ Enable Spot & Margin Trading (optional)
❌ NEVER Enable Withdrawals
✅ Enable IP Restrictions (empfohlen für Live)
```

---

## 🐛 Troubleshooting

### Problem: "API Secret not configured"
**Lösung:** Überprüfe ob in `env-config.js`:
- `TRADING_MODE` korrekt gesetzt ist
- API Keys korrekt eingetragen sind
- Keine Tippfehler in den Keys

### Problem: "Error fetching account balances"
**Mögliche Ursachen:**
1. **Falsche API Keys**
   - Überprüfe Keys in Binance Account
   - Stelle sicher, dass du Testnet Keys für Testnet verwendest

2. **IP Restriction**
   - Wenn IP-Whitelist aktiviert: Füge deine IP hinzu
   - Finde deine IP: https://www.whatismyip.com/

3. **Fehlende Berechtigungen**
   - API Key muss "Enable Reading" haben
   - Überprüfe in Binance API Management

4. **CORS Fehler**
   - Browser blockiert direkte API-Calls
   - **Lösung:** Backend-Proxy verwenden (siehe unten)

### Problem: CORS-Fehler im Browser
**Hinweis:** Binance API erlaubt keine direkten Browser-Calls aus Sicherheitsgründen!

**Lösung 1: Backend Proxy (empfohlen für Produktion)**
```typescript
// Erstelle einen Backend-Server (Node.js/Express)
// Der Server macht die API-Calls und leitet sie weiter
```

**Lösung 2: Browser Extension (nur für Development)**
- Installiere "CORS Unblock" Extension
- ⚠️ Nur für Development, nie in Produktion!

**Lösung 3: Testnet verwenden**
- Testnet hat weniger CORS-Restriktionen
- Besser für Entwicklung geeignet

---

## 📝 Beispiel-Logs

### Erfolgreicher Start (Testnet):
```
🧪 Testnet mode activated - using real Binance Testnet API
✅ Loaded 5 account balances from testnet API
✅ Loaded 0 positions from testnet API
✅ Loaded 2 open orders from testnet API
```

### Demo Mode:
```
🎮 Demo mode activated - using mock data
Demo mode: Using mock account balances
Demo mode: Using mock positions
Demo mode: No open orders
```

---

## 🚀 Best Practices

1. **Immer zuerst im Demo Mode testen**
   - Verstehe die UI
   - Teste Strategien mit Mock-Daten

2. **Dann Testnet verwenden**
   - Teste mit echten API-Calls
   - Kein Risiko für echtes Geld
   - Erhalte Test-USDT zum Trading

3. **Erst dann Live Mode**
   - Nach ausgiebigen Tests
   - Mit kleinen Beträgen starten
   - Immer Stop-Loss verwenden

---

## ⚠️ Wichtige Hinweise

- **API Keys niemals in Git committed!**
- **Testnet Keys ≠ Live Keys** (nicht austauschbar!)
- **Live Mode nur mit IP-Whitelist verwenden**
- **Regelmäßig API Keys rotieren**
- **Withdrawal-Berechtigung NIEMALS aktivieren**

---

## 📚 Weitere Ressourcen

- [Binance API Dokumentation](https://binance-docs.github.io/apidocs/spot/en/)
- [Binance Testnet](https://testnet.binance.vision/)
- [API Key Management](https://www.binance.com/en/my/settings/api-management)

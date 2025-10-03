# AlgoTrader Pro - Setup Guide (Binance Exchange)

---

## ⚠️ RECHTLICHER HINWEIS

**Durch die Nutzung dieser Software akzeptieren Sie:**
- Der Autor übernimmt KEINE Haftung für Trading-Verluste
- Alle Trades erfolgen auf EIGENES RISIKO
- Diese Software dient ausschließlich Bildungszwecken
- Siehe [LICENSE](LICENSE) für vollständige rechtliche Hinweise

**Investiere niemals mehr, als du bereit bist zu verlieren!**

---

## 🚀 Schnellstart

### 1. Dependencies installieren
```bash
npm install
```

### 2. Environment-Dateien konfigurieren

#### Option A: Demo-Modus (Empfohlen für erste Schritte)
Keine Konfiguration nötig! Das System läuft sofort mit Mock-Daten.

```bash
ng serve
```

#### Option B: Testnet-Modus (Empfohlen für Trading-Tests)

1. **Binance Testnet Account erstellen:**
   - Besuche: https://testnet.binance.vision/
   - Registriere einen Account (keine echten Daten nötig)
   - Erhalte Test-USDT für Trading-Tests

2. **Testnet API Keys generieren:**
   - Gehe zu: https://testnet.binance.vision/
   - Navigiere zu API Management
   - Erstelle neuen API Key
   - **Wichtig:** Aktiviere nur "Enable Reading" und "Enable Spot & Margin Trading"
   - **NIEMALS** "Enable Withdrawals" aktivieren!

3. **Environment konfigurieren:**
   - Bearbeite `src/env-config.js`
   ```javascript
   window.ENV_CONFIG = {
     TRADING_MODE: 'testnet', // <- Auf 'testnet' ändern

     BINANCE_TESTNET_API_KEY: 'DEIN_TESTNET_API_KEY',
     BINANCE_TESTNET_API_SECRET: 'DEIN_TESTNET_API_SECRET'
   };
   ```

#### Option C: Live-Trading (⚠️ NUR FÜR ERFAHRENE TRADER!)

1. **Binance API Keys erstellen:**
   - Besuche: https://www.binance.com/en/my/settings/api-management
   - 2FA aktivieren (PFLICHT!)
   - Neuen API Key erstellen

2. **API Key Berechtigungen (WICHTIG!):**
   ```
   ✅ Enable Reading
   ✅ Enable Spot & Margin Trading (optional)
   ❌ NEVER Enable Withdrawals (KRITISCH!)
   ✅ Enable IP Access Restrictions (EMPFOHLEN)
   ```

3. **IP-Whitelist konfigurieren:**
   - Füge deine IP-Adresse zur Whitelist hinzu
   - Finde deine IP: https://www.whatismyip.com/
   - In Binance: API Management → Edit restrictions → IP access restrictions

4. **Environment konfigurieren:**
   - Bearbeite `src/env-config.js`
   ```javascript
   window.ENV_CONFIG = {
     TRADING_MODE: 'live', // <- Auf 'live' ändern

     BINANCE_API_KEY: 'DEIN_LIVE_API_KEY',
     BINANCE_API_SECRET: 'DEIN_LIVE_API_SECRET'
   };
   ```

### 3. Anwendung starten

```bash
# Development Server
ng serve

# Production Build
ng build --configuration production
```

Öffne Browser: `http://localhost:4200`

---

## 📋 Environment Modi

### Demo-Modus (`tradingMode: 'demo'`)
- ✅ Keine API Keys benötigt
- ✅ Mock-Daten für alle Features
- ✅ Sicher zum Experimentieren
- ❌ Keine echten Marktdaten
- ❌ Keine echten Trades

**Verwendung:** Lernen und UI-Tests

### Testnet-Modus (`tradingMode: 'testnet'`)
- ✅ Echte API Integration
- ✅ Echte Marktdaten
- ✅ Test-USDT (kein Risiko)
- ✅ Alle Trading-Features
- ❌ Nur Testnet-Märkte

**Verwendung:** Strategie-Tests und Bot-Entwicklung

### Live-Modus (`tradingMode: 'live'`)
- ✅ Echte Binance API
- ✅ Echte Marktdaten
- ✅ Echtes Trading
- ⚠️ ECHTES GELD!
- ⚠️ ECHTES RISIKO!

**Verwendung:** Nur nach ausgiebigen Tests in Demo/Testnet!

---

## 🔐 Sicherheits-Checkliste

Bevor du Live-Trading aktivierst:

- [ ] API Key **OHNE** Withdrawal-Berechtigung erstellt
- [ ] IP-Whitelist aktiviert und konfiguriert
- [ ] 2FA auf Binance Account aktiviert
- [ ] API Keys **NICHT** in Git committed (in .gitignore!)
- [ ] Kleine Beträge für erste Tests verwenden
- [ ] Stop-Loss Limits konfiguriert
- [ ] Strategie ausgiebig im Testnet getestet
- [ ] Regelmäßiges Monitoring geplant
- [ ] Backup der Konfiguration erstellt

---

## 🛠️ Erweiterte Konfiguration

### Risk Management Settings

In `src/app/config/environment.config.ts`:
```typescript
settings: {
  dataRefreshInterval: 10000,      // Update-Intervall (ms)
  maxOrderSizeUsdt: 1000,          // Max. Order-Größe
  autoTradingEnabled: false,        // Auto-Trading Standardwert
  defaultLeverage: 1,              // Standard-Hebel (1x = kein Hebel)
  maxPositionSizePercent: 10,      // Max. 10% des Kapitals pro Position
  maxDailyLossPercent: 5,          // Max. 5% Tagesverlust
  debugMode: true                  // Debug-Logging
}
```

### Trading Strategien konfigurieren

1. Öffne die App unter `http://localhost:4200`
2. Navigiere zu "Strategien"
3. Klicke auf "+ Neue Strategie"
4. Konfiguriere:
   - Name und Beschreibung
   - Trading-Paar (z.B. BTCUSDT)
   - Zeitrahmen (1m, 5m, 15m, etc.)
   - Strategie-Typ (RSI oder Pine Script)
   - Order-Größe
   - Auto-Execute (nur wenn sicher!)

---

## 📊 Verfügbare Trading-Paare

### Spot Trading
- BTCUSDT, ETHUSDT, BNBUSDT
- ADAUSDT, DOGEUSDT, XRPUSDT
- DOTUSDT, UNIUSDT, LTCUSDT
- SOLUSDT, LINKUSDT, MATICUSDT

### Zeitrahmen
- 1m (1 Minute)
- 5m (5 Minuten)
- 15m (15 Minuten)
- 1h (1 Stunde)
- 4h (4 Stunden)
- 1d (1 Tag)

---

## 🔧 Troubleshooting

### "API Key Invalid" Fehler
- Überprüfe API Key und Secret in `environment.ts`
- Stelle sicher, dass der richtige Modus aktiv ist (testnet/live)
- Überprüfe IP-Whitelist in Binance

### WebSocket Verbindungsfehler
- Firewall/Proxy Settings überprüfen
- WSS (SSL) Verbindungen erlauben
- Binance Status prüfen: https://www.binance.com/en/support/announcement

### "CORS" Fehler
- Backend-Proxy konfigurieren
- Oder direkte API-Aufrufe über Server-Side implementieren

### Build Fehler
```bash
# Node modules neu installieren
rm -rf node_modules package-lock.json
npm install

# Cache leeren
ng cache clean
npm cache clean --force

# Neu builden
ng build
```

---

## 📚 Ressourcen

### Binance API Dokumentation
- **Spot API:** https://binance-docs.github.io/apidocs/spot/en/
- **Testnet:** https://testnet.binance.vision/
- **WebSocket Streams:** https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams

### Trading Wissen
- **Risk Management:** https://academy.binance.com/en/articles/what-is-risk-management
- **Technical Analysis:** https://academy.binance.com/en/articles/what-is-technical-analysis
- **Pine Script:** https://www.tradingview.com/pine-script-docs/

---

## ⚠️ Wichtige Hinweise

1. **Dieses System ist zu Bildungszwecken gedacht**
2. **Trading mit Kryptowährungen birgt erhebliche Risiken**
3. **Investiere nur Geld, das du bereit bist zu verlieren**
4. **Teste IMMER zuerst im Testnet**
5. **Keine Garantie für Gewinne oder Funktionalität**
6. **Nutzer tragen volle Verantwortung für ihre Trades**

---

## 🆘 Support

Bei Problemen:
1. Überprüfe diese Dokumentation
2. Schau in die `README.md`
3. Prüfe Binance System Status
4. Erstelle ein Issue im Repository

**Viel Erfolg beim Trading! 📈**

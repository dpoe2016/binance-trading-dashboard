# AlgoTrader Pro

A professional algorithmic trading platform for cryptocurrency markets, built with Angular 20.

**Supports multiple exchanges including Binance** - A modern, feature-rich trading system with advanced indicators, backtesting, and strategy automation.

---

## ⚠️ HAFTUNGSAUSSCHLUSS / DISCLAIMER

**WICHTIGER HINWEIS:** Dieses Projekt dient ausschließlich zu **Bildungs- und Demonstrationszwecken**.

### Rechtliche Hinweise:

- Der Autor übernimmt **KEINE Verantwortung** für finanzielle Verluste oder Schäden, die durch die Nutzung dieser Software entstehen
- Alle Trades erfolgen auf **EIGENES RISIKO**
- Trading mit Kryptowährungen birgt **ERHEBLICHE RISIKEN** und kann zum **TOTALVERLUST** des eingesetzten Kapitals führen
- Diese Software wird **"AS IS"** ohne jegliche Garantien bereitgestellt
- **KEINE ANLAGEBERATUNG:** Diese Software stellt keine Finanz- oder Anlageberatung dar
- Der Nutzer trägt die **volle Verantwortung** für alle durchgeführten Handelsentscheidungen
- Es wird empfohlen, vor der Nutzung einen qualifizierten Finanzberater zu konsultieren

### Nutzungsbedingungen:

Durch die Nutzung dieser Software akzeptieren Sie, dass:
- Sie volljährig sind und die Berechtigung haben, in Ihrem Land mit Kryptowährungen zu handeln
- Sie die Risiken des Kryptohandels vollständig verstehen
- Sie ausschließlich Kapital einsetzen, dessen Verlust Sie sich leisten können
- Der Autor von jeglicher Haftung freigestellt wird

**Investiere niemals Geld, das du dir nicht leisten kannst zu verlieren!**

---

## 🚀 Features

### Dashboard
- **Kontoverwaltung**: Übersicht über Kontostände, Positionen und offene Orders
- **Live-Statistiken**: Echtzeit P&L, Margin-Nutzung und Account-Stats
- **Such- und Filterfunktion**: Schnelles Finden von Assets
- **Inline-Editing**: Direkte Bearbeitung von Strategien
- **Settings-Persistenz**: Speichert Benutzereinstellungen

### Charts & Technical Analysis
- **TradingView Lightweight Charts**: Professionelle Candlestick-Charts
- **Echtzeit-Updates**: Live-Preisdaten via WebSocket
- **Erweiterte Technische Indikatoren**:
  - **Trend-Indikatoren**: SMA 20 & 50, MACD (12, 26, 9), Bollinger Bands (20, 2)
  - **Momentum-Indikatoren**: RSI (14), Stochastic Oscillator (%K, %D)
  - **Volatilität**: ATR (Average True Range), Choppiness Index
  - **Volumen**: Volume Bars mit Up/Down-Färbung
- **Strategy Signals**: Visuelle Markierung von Buy/Sell-Signalen
  - RSI Oversold/Overbought (< 30 / > 70)
  - Golden Cross / Death Cross (SMA Crossover)
  - MACD Crossovers
  - Bollinger Band Breakouts
  - Stochastic Crossovers
- **Multi-Pane Charts**: Separate Subcharts für RSI, MACD, Stochastic, Volume
- **Lokale Zeitformatierung**: X-Achse in lokaler Zeitzone
- **Auto-Skalierung**: Automatische Anpassung an geladene Daten
- **Zeitrahmen**: 1m, 5m, 15m, 1h, 4h, 1d
- **Symbol-Auswahl**: BTC, ETH, BNB, ADA, DOGE, XRP, DOT, UNI, LTC, SOL

### Order Management System ✨ NEW
- **Order Types**: Market, Limit, Stop-Loss, Take-Profit
- **Order Placement**: Intuitive UI mit Validierung
- **Order History**: Vollständige Historie aller Orders
- **Order Tracking**: Echtzeit-Status-Updates
- **Order Notifications**: Browser-Benachrichtigungen bei Fills
- **Order Modification**: Ändern von offenen Orders
- **Order Cancellation**: Stornierung von Orders
- **Confirmation Dialogs**: Sicherheitsabfragen vor kritischen Aktionen

### Position Management ✨ NEW
- **Position Tracking**: Echtzeit-Übersicht aller offenen Positionen
- **P&L Dashboard**: Unrealized P&L, Position Value, Margin Used
- **Position Details**: Entry Price, Mark Price, Liquidation Price
- **Position Closing**: Volle oder partielle Schließung (1-100% Slider)
- **Risk/Reward Calculator**:
  - Entry Price, Stop Loss, Take Profit Eingabe
  - Automatische R:R Ratio Berechnung
  - Risk % und Reward % Anzeige
  - Position Size Empfehlung
- **Position Metrics**: Days Held, P&L %, Side (LONG/SHORT)

### Strategieverwaltung
- **Strategy Builder**: Erstelle und konfiguriere Trading-Strategien
- **Pine Script Support**: Grundlegende Unterstützung für Pine Script
- **Vorkonfigurierte Strategien**:
  - RSI-Strategie (Oversold/Overbought)
  - SMA Crossover (Golden Cross / Death Cross)
  - MACD Crossover
  - Bollinger Band Breakout
  - Stochastic Oscillator
- **Auto-Execute**: Optionale automatische Ausführung
- **Inline-Editing**: Bearbeite Strategien direkt in der Liste
- **Multi-Indicator Strategies**: Kombiniere mehrere Indikatoren

---

## ⚡ Quick Start (3 Schritte)

### Schritt 1: Installation

```bash
npm install
```

### Schritt 2: Testnet API Keys erstellen

1. Gehe zu: **https://testnet.binance.vision/**
2. Registriere einen Account (keine echten Daten nötig)
3. Klicke auf **"Generate HMAC_SHA256 Key"**
4. Kopiere deinen **API Key** und **Secret Key**

### Schritt 3: .env Datei konfigurieren

```bash
# Kopiere die Beispieldatei
cp .env.example .env
```

Bearbeite `.env`:
```bash
# Trading Mode
TRADING_MODE=testnet

# Testnet API Keys
BINANCE_TESTNET_API_KEY=dein_testnet_api_key_hier
BINANCE_TESTNET_API_SECRET=dein_testnet_secret_hier

# Proxy Server (für echte API-Calls)
USE_PROXY=true
PROXY_URL=http://localhost:3000
PROXY_PORT=3000
```

### Schritt 4: Server starten

**Terminal 1 - Proxy Server:**
```bash
npm run proxy
```

**Terminal 2 - Angular App:**
```bash
npm start
```

Öffne: **http://localhost:4200**

---

## 🎯 Trading Modi

Das System unterstützt 3 Modi:

### 1. 🎮 Demo Mode (Standard)
- **Keine API Keys nötig**
- Zeigt Mock-Daten
- Perfekt zum Testen der UI
- Keine echten Trades
- Keine Konfiguration erforderlich

### 2. 🧪 Testnet Mode (Empfohlen zum Testen)
- **Binance Testnet API Keys benötigt**
- Echte API-Integration
- Test-USDT (kein echtes Geld)
- Sichere Testumgebung
- **Setup**: Siehe [Quick Start](#-quick-start-3-schritte)

### 3. 💰 Live Mode (⚠️ Nur für Produktion!)
- **Binance Live API Keys benötigt**
- Echte API-Integration
- Echtes Geld - **NUR nach ausgiebigen Tests!**
- IP-Whitelist dringend empfohlen
- **WICHTIG:** Withdrawal-Berechtigung NIEMALS aktivieren!

---

## 🔧 Proxy Server - CORS-Lösung

### Warum ein Proxy Server?

Binance API erlaubt **keine direkten Calls aus dem Browser** (CORS-Policy).

```
Angular App  →  Proxy Server (localhost:3000)  →  Binance API
         ✅ Erlaubt                   ✅ Erlaubt
```

### Proxy Server starten

**Option 1: Manuell in 2 Terminals** (Empfohlen)
```bash
# Terminal 1
npm run proxy

# Terminal 2
npm start
```

**Option 2: Automatisch**
```bash
npm run start:full
```

### Erfolgskontrolle

Wenn der Proxy Server erfolgreich läuft, siehst du:

```
============================================================
🚀 Binance API Proxy Server
============================================================
📍 Server running on: http://localhost:3000
📋 Trading Mode: TESTNET
🔗 Binance API: https://testnet.binance.vision
🔑 API Key: abc123...

✅ Ready to proxy requests from Angular app
============================================================
```

---

## 📋 API Berechtigungen

Für **Testnet und Live** benötigst du:

```
✅ Enable Reading
✅ Enable Spot & Margin Trading (optional)
❌ NEVER Enable Withdrawals
✅ Enable IP Restrictions (empfohlen für Live)
```

### API Keys erstellen

**Testnet:**
- URL: https://testnet.binance.vision/
- Registrierung: Kostenlos, keine echten Daten nötig
- API Keys: Unter "API Management" → "Generate HMAC_SHA256 Key"

**Live:**
- URL: https://www.binance.com/en/my/settings/api-management
- **WICHTIG:**
  - Withdrawal-Berechtigung NIEMALS aktivieren!
  - IP-Whitelist aktivieren
  - 2FA aktivieren
  - Regelmäßig Keys rotieren

---

## 🛠️ Technische Details

### Verwendete Technologien

- **Angular 20**: Frontend Framework (Standalone Components)
- **RxJS**: Reaktive Programmierung
- **TradingView Lightweight Charts v5**: Chart-Bibliothek
- **TypeScript**: Typsicherer Code
- **SCSS**: Styling
- **WebSocket**: Echtzeit-Preisdaten
- **Node.js**: Proxy Server
- **crypto-js**: HMAC SHA256 Signaturen

### Projektstruktur

```
binance-trading-system/
├── src/app/
│   ├── components/
│   │   ├── dashboard/          # Hauptdashboard mit Übersicht
│   │   ├── chart/              # Chart mit Indikatoren
│   │   └── strategy-manager/   # Strategieverwaltung
│   ├── services/
│   │   ├── binance.service.ts  # Binance API Integration
│   │   ├── strategy.service.ts # Strategie-Engine
│   │   └── settings.service.ts # Settings Persistence
│   ├── models/
│   │   └── trading.model.ts    # TypeScript Interfaces
│   └── config/
│       └── environment.config.ts # Auto-generierte Config
├── server/
│   └── proxy-server.js         # CORS Proxy Server
├── scripts/
│   ├── generate-env.js         # .env → environment.ts
│   └── increment-version.js    # Version Management
└── .env                        # Konfiguration (nicht in Git!)
```

### API Integrationen

| Datentyp | API Endpoint | Auth | Beschreibung |
|----------|--------------|------|--------------|
| Account Balances | `/api/v3/account` | ✅ | Spot-Kontostände |
| Open Orders | `/api/v3/openOrders` | ✅ | Offene Spot-Orders |
| Futures Positions | `/fapi/v2/positionRisk` | ✅ | Futures-Positionen |
| Kline/Candlestick | `/api/v3/klines` | ❌ | Historische Preisdaten |
| Ticker (WebSocket) | `wss://stream.binance.com:9443/ws` | ❌ | Live-Preisdaten |

---

## 📊 Trading-Strategien

### RSI-Strategie

Konfigurierbare Parameter:
- **RSI Period**: 14 (Standard)
- **Oversold Level**: < 30 (Kaufsignal)
- **Overbought Level**: > 70 (Verkaufssignal)

Beispiel:
```typescript
{
  name: "RSI Oversold",
  useRSI: true,
  quantity: "0.001",
  autoExecute: false
}
```

### SMA Crossover Strategie

Verwendet zwei gleitende Durchschnitte:
- **SMA 20**: Schnellerer Durchschnitt
- **SMA 50**: Langsamerer Durchschnitt

Signale:
- **Golden Cross**: SMA 20 kreuzt SMA 50 nach oben → Bullish
- **Death Cross**: SMA 20 kreuzt SMA 50 nach unten → Bearish

### Pine Script Support

Grundlegende Unterstützung für Pine Script Strategien:

```pine
//@version=5
strategy("SMA Crossover", overlay=true)

sma20 = ta.sma(close, 20)
sma50 = ta.sma(close, 50)

// Golden Cross
if (ta.crossover(sma20, sma50))
    strategy.entry("Long", strategy.long)

// Death Cross
if (ta.crossunder(sma20, sma50))
    strategy.close("Long")
```

---

## 🔧 Troubleshooting

### Problem: App zeigt noch Demo Mode

**Ursache:** `TRADING_MODE` steht noch auf `demo` in der `.env` Datei

**Lösung:**
```bash
# In .env Datei:
TRADING_MODE=testnet  # ✅ Richtig
```

Dann Server neu starten:
```bash
npm start
```

### Problem: CORS-Fehler

**Fehler:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Lösung:**
1. Stelle sicher, dass `USE_PROXY=true` in `.env`
2. Starte Proxy Server: `npm run proxy`
3. Starte Angular App: `npm start`

### Problem: API Keys funktionieren nicht

**Häufige Fehler:**
```bash
# ❌ Falsch - Anführungszeichen nicht verwenden
BINANCE_TESTNET_API_KEY="abc123"

# ❌ Falsch - Leerzeichen am Ende
BINANCE_TESTNET_API_KEY=abc123

# ✅ Richtig - Keys ohne Anführungszeichen
BINANCE_TESTNET_API_KEY=abc123xyz
BINANCE_TESTNET_API_SECRET=def456uvw
```

### Problem: Änderungen in .env werden nicht übernommen

**Lösung:**
1. Server stoppen (Strg+C)
2. Umgebungsdateien neu generieren: `npm run generate-env`
3. Server neu starten: `npm start`

### Problem: Futures API 404 Error

**Hinweis:** Normal für Spot-only Accounts oder Testnet!

Die App behandelt diesen Fehler automatisch:
```
⚠️ Futures API not available (404)
This is normal for spot-only accounts or testnet
```

Keine Aktion erforderlich - die App funktioniert trotzdem.

### Problem: WebSocket connection failed

**Ursache:** Testnet hat keine WebSocket-Unterstützung

**Lösung:** Die App verwendet automatisch Production WebSocket für Live-Daten (öffentlich, keine Auth nötig).

### Problem: RSI Subchart erscheint nicht nach Strategie-Wechsel

**Ursache:** DOM-Update Timing

**Lösung:** Bereits gefixt - 100ms Verzögerung vor RSI Chart Initialisierung.

---

## 🚀 Entwicklung

### Neue Komponente erstellen
```bash
ng generate component components/component-name
```

### Build für Produktion
```bash
npm run build
```

Die Build-Artefakte werden im `dist/` Verzeichnis gespeichert.

### Tests ausführen
```bash
ng test
```

### Linting
```bash
ng lint
```

---

## 📦 Versionierung

Das Projekt verwendet automatische Versionierung:

```bash
# Automatisch bei Commits mit Conventional Commits:
git commit -m "feat: neue Funktion"       # → Minor (0.1.0 → 0.2.0)
git commit -m "fix: Bugfix"               # → Patch (0.1.0 → 0.1.1)
git commit -m "feat!: Breaking Change"    # → Major (0.1.0 → 1.0.0)

# Oder manuell:
npm run version:patch  # 0.1.0 → 0.1.1
npm run version:minor  # 0.1.0 → 0.2.0
npm run version:major  # 0.1.0 → 1.0.0
```

Version wird automatisch aktualisiert in:
- `package.json`
- `src/app/app.ts` (angezeigt in Navigation Bar)
- `CHANGELOG.md`

---

## 🔐 Sicherheitshinweise

### API Keys
- ⚠️ **WICHTIG**: Speichere keine Credentials im Code!
- `.env` Datei wird NICHT in Git committed (steht in `.gitignore`)
- Verwende niemals API-Keys mit Withdrawal-Rechten
- Aktiviere IP-Whitelist für Live Keys
- Rotiere Keys regelmäßig

### Trading
- Teste das System zuerst mit kleinen Beträgen oder im Testnet
- Setze immer Stop-Loss und Take-Profit Parameter
- Überwache automatisierte Strategien regelmäßig
- Verstehe die Strategie bevor du sie aktivierst
- Nur Kapital einsetzen, dessen Verlust du dir leisten kannst

### Proxy Server
- **NUR für Development** gedacht
- NIEMALS den Proxy Server öffentlich zugänglich machen
- Läuft nur auf `localhost` (127.0.0.1)
- Für Produktion: Richtiges Backend implementieren

---

## 📚 Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für eine vollständige Versionshistorie.

---

## 🗺️ Roadmap

### ✅ Completed Features (Phase 1-2)
- [x] Grundlegendes Dashboard mit Mock-Daten
- [x] Binance API Integration (Testnet & Live)
- [x] TradingView Charts mit Candlesticks
- [x] **Advanced Technical Indicators** (Phase 1 Complete - 100%)
  - [x] MACD (12, 26, 9) mit Histogram
  - [x] Bollinger Bands (20, 2) mit Squeeze Detection
  - [x] Stochastic Oscillator (%K, %D)
  - [x] ATR (Average True Range)
  - [x] Choppiness Index
  - [x] Volume Indicators
  - [x] RSI (14) & SMA (20, 50)
- [x] **Order Management System** (Phase 2 - Task 2.1 Complete)
  - [x] Market, Limit, Stop-Loss, Take-Profit Orders
  - [x] Order Validation & Confirmation
  - [x] Order History & Tracking
  - [x] Real-time Order Status Updates
  - [x] Order Fill Notifications
  - [x] Order Modification & Cancellation
- [x] **Position Management** (Phase 2 - Task 2.2 Complete)
  - [x] Real-time Position Tracking
  - [x] P&L Dashboard (Unrealized, Realized, Total)
  - [x] Position Details Modal
  - [x] Partial/Full Position Closing (1-100% Slider)
  - [x] Risk/Reward Calculator
  - [x] Position Metrics (Entry, Mark, Liquidation Price)
- [x] Strategieverwaltung mit Multi-Indicator Support
- [x] Echtzeit-Updates via WebSocket
- [x] Settings-Persistenz
- [x] Inline-Editing
- [x] Multi-Pane Charts (RSI, MACD, Stochastic, Volume)
- [x] Strategy Signal Detection (RSI, MACD, SMA, Bollinger, Stochastic)
- [x] Lokale Zeitformatierung

### 🚧 In Progress (Phase 2-3)
- [ ] **Risk Management System** (Phase 2 - Task 2.3) - NEXT
  - [ ] Account Risk Limits
  - [ ] Position Size Limits
  - [ ] Daily Loss Limits
  - [ ] Drawdown Protection
  - [ ] Risk Monitoring Dashboard
  - [ ] Emergency Stop-All Feature
- [ ] **Portfolio Management** (Phase 2 - Task 2.4)
  - [ ] Multi-Asset Portfolio View
  - [ ] Portfolio Performance Analytics
  - [ ] Asset Allocation Charts
  - [ ] Correlation Matrix
  - [ ] Rebalancing Suggestions
- [ ] **Performance Analytics** (Phase 2 - Task 2.5)
  - [ ] Trade Performance Metrics
  - [ ] Win/Loss Ratio
  - [ ] Sharpe Ratio, Sortino Ratio
  - [ ] Maximum Drawdown
  - [ ] Performance Charts

### 📅 Planned Features (Phase 3-13)

**Phase 3: Backtesting Engine**
- [ ] Historical Data Management
- [ ] Strategy Backtesting Framework
- [ ] Walk-Forward Analysis
- [ ] Monte Carlo Simulation
- [ ] Performance Reports
- [ ] Parameter Optimization

**Phase 4: Alert & Notification System**
- [ ] Price Alerts
- [ ] Indicator-Based Alerts
- [ ] Browser Notifications
- [ ] Email Notifications
- [ ] Telegram Bot Integration
- [ ] Discord Webhooks

**Phase 5: Advanced Order Types**
- [ ] OCO (One-Cancels-Other)
- [ ] Trailing Stop Loss
- [ ] Iceberg Orders
- [ ] TWAP/VWAP Orders
- [ ] Bracket Orders
- [ ] Conditional Orders
- [ ] Ladder Orders

**Phase 6: Trading Bot Automation**
- [ ] Auto-Trading Engine
- [ ] Strategy Scheduler
- [ ] Bot Performance Monitoring
- [ ] Kill Switch System

**Phase 7: Multi-Exchange Support**
- [ ] Coinbase Pro Integration
- [ ] Kraken Integration
- [ ] Unified Exchange Interface

**Phase 8: UI/UX Enhancements**
- [ ] Dark/Light Theme Toggle
- [ ] Customizable Dashboard Layouts
- [ ] Keyboard Shortcuts
- [ ] Advanced Filtering & Sorting
- [ ] Data Export (CSV, JSON, PDF)

**Phase 9: AI/ML Trading Features** (20 Tasks)
- [ ] Predictive Price Models (LSTM, GRU, Transformer)
- [ ] Sentiment Analysis (News, Social Media)
- [ ] Anomaly Detection
- [ ] Pattern Recognition (Chart Patterns)
- [ ] Market Regime Detection
- [ ] Trade Quality Scoring
- [ ] Smart Order Routing
- [ ] Reinforcement Learning Trading Agents
- [ ] Portfolio Optimization with AI
- [ ] Support/Resistance Level Detection
- [ ] Volume Profile Analysis
- [ ] Multi-Timeframe AI Confirmation
- [ ] Market Microstructure Analysis
- [ ] Execution Quality Analytics
- [ ] Adaptive Strategy Parameters
- [ ] Smart Entry/Exit Timing
- [ ] Risk Score Prediction
- [ ] Correlation-Based Hedging
- [ ] Alternative Data Integration
- [ ] AI-Powered Trade Journaling

**Phase 10: Mobile & PWA**
- [ ] Progressive Web App (PWA)
- [ ] Responsive Mobile UI
- [ ] Push Notifications
- [ ] Offline Mode
- [ ] Native Mobile App (React Native)

**Phase 11: Social Trading**
- [ ] Trade Copying
- [ ] Leaderboards

**Phase 12: Advanced Analytics**
- [ ] Custom Indicators Builder
- [ ] Advanced Statistical Analysis
- [ ] Market Correlation Analysis
- [ ] Heatmaps

**Phase 13: Documentation & Education**
- [ ] Interactive Documentation
- [ ] API Documentation
- [ ] Video Tutorials
- [ ] Educational Content (Trading Concepts, Risk Management)

---

### 📊 Development Progress
- **Phase 1:** ✅ 100% Complete (5/5 tasks) - Advanced Technical Indicators
- **Phase 2:** 🚧 40% Complete (2/5 tasks) - Order & Position Management
- **Phase 3-13:** 📅 Planned (250+ tasks remaining)

**Next Priorities:**
1. Risk Management System (Phase 2.3)
2. Portfolio Management (Phase 2.4)
3. Alert System (Phase 4)
4. Backtesting Engine (Phase 3)

---

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz mit Trading-Disclaimer lizenziert.

**Zusammenfassung:**
- ✅ Freie Nutzung, Modifikation und Distribution
- ⚠️ Keine Gewährleistung oder Garantie
- ⚠️ Autor übernimmt keine Haftung für Trading-Verluste
- ⚠️ Nutzung erfolgt ausschließlich auf eigenes Risiko

---

## 🤝 Support

Bei Fragen oder Problemen:
1. Checke dieses README
2. Überprüfe die [Troubleshooting](#-troubleshooting) Sektion
3. Erstelle ein Issue im Repository

---

## 👨‍💻 Autor

Entwickelt als Bildungsprojekt zur Demonstration moderner Web-Technologien und Trading-Konzepte.

---

**Hinweis**: Dies ist ein Bildungsprojekt. Trading mit Kryptowährungen birgt erhebliche Risiken. **Investiere niemals Geld, das du dir nicht leisten kannst zu verlieren!**

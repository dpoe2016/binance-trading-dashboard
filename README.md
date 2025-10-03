# Binance Trading System

Ein modernes Handelssystem für Kryptowährungen auf Binance, gebaut mit Angular 20.

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

## Features

- **Dashboard**: Übersicht über Kontostände, Positionen, offene Orders und Statistiken
- **Chart-Visualisierung**: Interaktive Candlestick-Charts mit TradingView Lightweight Charts
- **Handelsstrategien**: Definiere und führe automatisierte Handelsstrategien aus
- **Pine Script Support**: Grundlegende Unterstützung für Pine Script basierte Strategien
- **Technische Indikatoren**: RSI, SMA, EMA und mehr
- **Echtzeit-Updates**: Live-Preisdaten und automatische Aktualisierung der Kontoinformationen

## Voraussetzungen

- Node.js (v18 oder höher)
- npm oder yarn
- Binance API Schlüssel (API Key und Secret)

## Installation

1. Repository klonen oder Projektordner öffnen:
```bash
cd binance-trading-system
```

2. Dependencies installieren:
```bash
npm install
```

3. **API Konfiguration (3 Modi verfügbar):**

### 🎮 Demo-Modus (Standard - Empfohlen zum Starten)
Keine Konfiguration nötig! Verwendet Mock-Daten.

### 🧪 Testnet-Modus (Empfohlen zum Testen)
1. Erstelle einen Account auf https://testnet.binance.vision/
2. Generiere API Keys
3. Erstelle eine `.env` Datei:
```bash
cp .env.example .env
```
4. Bearbeite `.env`:
```bash
TRADING_MODE=testnet
BINANCE_TESTNET_API_KEY=DEIN_TESTNET_API_KEY
BINANCE_TESTNET_API_SECRET=DEIN_TESTNET_API_SECRET
```

### 💰 Live-Modus (⚠️ Nur für Produktion!)
1. API Keys von https://www.binance.com/en/my/settings/api-management
2. **WICHTIG:** Withdrawal-Berechtigung NIEMALS aktivieren!
3. IP-Whitelist aktivieren
4. Bearbeite `.env`:
```bash
TRADING_MODE=live
BINANCE_API_KEY=DEIN_LIVE_API_KEY
BINANCE_API_SECRET=DEIN_LIVE_API_SECRET
```

📖 **Detaillierte Setup-Anleitung:** Siehe [SETUP.md](SETUP.md)

**⚠️ WICHTIG: Die `.env` Datei wird NICHT in Git committed (steht in .gitignore)!**

## Development Server

Entwicklungsserver starten:

```bash
ng serve
```

Navigiere zu `http://localhost:4200/`. Die Anwendung lädt automatisch neu, wenn du Änderungen an den Quelldateien vornimmst.

---

## ⚡ Testnet-Modus aktivieren

**Standard:** Die App läuft im **Demo-Modus** mit Mock-Daten.

**Für echte Testnet-Daten:**

1. **Erstelle .env Datei:** `cp .env.example .env`
2. **Bearbeite:** `.env`
3. **Ändere:** `TRADING_MODE=demo` → `TRADING_MODE=testnet`
4. **Trage API Keys ein** (von https://testnet.binance.vision/)
5. **Starte neu:** `npm start`

**Siehe:** [QUICK-START.md](QUICK-START.md) für detaillierte Anleitung

---

## Projektstruktur

```
src/app/
├── components/
│   ├── dashboard/          # Hauptdashboard mit Übersicht
│   ├── chart/              # Chart-Komponente mit TradingView
│   └── strategy-manager/   # Strategieverwaltung
├── services/
│   ├── binance.service.ts  # Binance API Integration
│   └── strategy.service.ts # Strategie-Engine
├── models/
│   └── trading.model.ts    # TypeScript Interfaces
└── app.routes.ts          # Routing-Konfiguration
```

## Verwendung

### Dashboard
- Zeigt aktuelle Kontostände, Positionen und offene Orders
- Live-Statistiken über P&L und Margin-Nutzung
- Aktive Handelsstrategien und deren Status

### Charts
- Auswahl verschiedener Trading-Paare (BTC, ETH, BNB, etc.)
- Mehrere Zeitrahmen (1m, 5m, 15m, 1h, 4h, 1d)
- Interaktive Candlestick-Charts

### Strategieverwaltung
- Neue Strategien erstellen und konfigurieren
- Pine Script Integration für benutzerdefinierte Strategien
- RSI-basierte Standard-Strategie verfügbar
- Strategien aktivieren/deaktivieren
- Automatische Ausführung optional

## Handelsstrategien

### Beispiel: RSI-Strategie
```
- Kaufen wenn RSI < 30 (überverkauft)
- Verkaufen wenn RSI > 70 (überkauft)
```

### Beispiel: Pine Script SMA Crossover
```pine
//@version=5
strategy("SMA Crossover", overlay=true)

sma20 = ta.sma(close, 20)
sma50 = ta.sma(close, 50)

if (ta.crossover(sma20, sma50))
    strategy.entry("Long", strategy.long)

if (ta.crossunder(sma20, sma50))
    strategy.close("Long")
```

## Sicherheitshinweise

⚠️ **WICHTIG**:
- Teste das System zuerst mit kleinen Beträgen oder im Testnet
- Verwende niemals API-Keys mit Withdrawal-Rechten
- Setze immer Stop-Loss und Take-Profit Parameter
- Überwache automatisierte Strategien regelmäßig
- Speichere keine Credentials im Code

## Technische Details

### Verwendete Technologien
- **Angular 20**: Frontend Framework
- **RxJS**: Reaktive Programmierung
- **Binance API Node**: API Client für Binance
- **Lightweight Charts**: Chart-Bibliothek von TradingView
- **TypeScript**: Typsicherer Code
- **SCSS**: Styling

### API Integrationen
- Binance REST API für Orders und Kontoinformationen
- Binance WebSocket für Echtzeit-Preisdaten
- Candlestick-Daten und technische Indikatoren

## Entwicklung

### Neue Komponente erstellen
```bash
ng generate component component-name
```

### Build für Produktion
```bash
ng build
```

Die Build-Artefakte werden im `dist/` Verzeichnis gespeichert.

### Tests ausführen
```bash
ng test
```

### Versionierung

Das Projekt verwendet automatische Versionierung basierend auf Commit-Nachrichten:

```bash
# Version wird automatisch erhöht bei Commits mit:
git commit -m "feat: neue Funktion"   # → Minor Version (0.1.0 → 0.2.0)
git commit -m "fix: Bugfix"           # → Patch Version (0.1.0 → 0.1.1)
git commit -m "feat!: Breaking Change" # → Major Version (0.1.0 → 1.0.0)

# Oder manuell:
npm run version:patch  # 0.1.0 → 0.1.1
npm run version:minor  # 0.1.0 → 0.2.0
npm run version:major  # 0.1.0 → 1.0.0
```

Siehe [VERSIONING.md](VERSIONING.md) für Details.

## Roadmap

- [ ] Vollständiger Pine Script Interpreter
- [ ] Backtesting-Funktionalität
- [ ] Erweiterte Order-Typen (OCO, etc.)
- [ ] Portfolio-Management
- [ ] Trading-Bot mit ML-Integration
- [ ] Multi-Exchange Support
- [ ] Telegram/Discord Benachrichtigungen

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz mit Trading-Disclaimer lizenziert. Siehe [LICENSE](LICENSE) für Details.

**Zusammenfassung:**
- ✅ Freie Nutzung, Modifikation und Distribution
- ⚠️ Keine Gewährleistung oder Garantie
- ⚠️ Autor übernimmt keine Haftung für Trading-Verluste
- ⚠️ Nutzung erfolgt ausschließlich auf eigenes Risiko

## Support

Bei Fragen oder Problemen erstelle bitte ein Issue im Repository.

---

**Hinweis**: Dies ist ein Bildungsprojekt. Trading mit Kryptowährungen birgt erhebliche Risiken. Investiere nur Geld, das du bereit bist zu verlieren.

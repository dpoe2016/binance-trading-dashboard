# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Dark Mode Colors**: Adjusted dark theme to use dark gray instead of pure black
  - Background primary: #1a1a1a → #2a2d35 (dark gray)
  - Background secondary: #242424 → #1e2128 (darker gray)
  - Background tertiary: #2d2d2d → #363a45 (medium gray)
  - Better readability and reduced eye strain
- **All Component Backgrounds**: Fixed white backgrounds across all pages
  - ✅ Chart component: Full theme support with CSS variables
  - ✅ Strategy Manager: All white backgrounds replaced
  - ✅ Backtesting component: Complete theme integration
  - ✅ Dashboard component: Comprehensive theme support
  - All components now properly respect dark/light theme
- **Table Theming**: Fixed all table backgrounds to respect theme colors
  - Table headers now use --bg-tertiary
  - Table rows now use --bg-primary
  - Table hover state uses --bg-hover
  - All text colors use theme variables
  - Borders use --border-primary and --border-secondary
- **Input & Select Elements**: All form elements now themed
  - Inputs use --bg-primary background
  - Selects use --bg-secondary background
  - All borders use --border-primary
  - Text colors use --text-primary
  - Smooth transitions on theme changes (0.3s ease)

## [0.7.5] - 2025-10-04

### Added
- **Dark/Light Theme System**: Complete theme switching functionality
  - ThemeService with BehaviorSubject for reactive theme updates
  - Three theme modes: light, dark, and auto (system preference)
  - Comprehensive color palettes for both themes
  - 16 CSS custom properties for consistent theming
  - Theme toggle button in navigation bar (☀️/🌙 icon)
  - localStorage persistence for theme preference
  - System theme preference detection (prefers-color-scheme)
  - Smooth transitions (0.3s ease) for theme changes
  - Real-time theme change listener for system preference updates

### Changed
- Updated global styles with CSS variables (src/styles.scss)
  - All colors now use CSS custom properties
  - Background colors: --bg-primary, --bg-secondary, --bg-tertiary, --bg-hover
  - Text colors: --text-primary, --text-secondary, --text-tertiary
  - Border colors: --border-primary, --border-secondary
  - Accent colors: --accent-primary, --accent-secondary
  - Status colors: --success, --danger, --warning, --info
  - Trading colors: --buy-green, --sell-red
  - Chart colors: --chart-grid, --chart-text
- Updated app component with theme integration
- Enhanced navigation bar with theme toggle button
- Updated TASKS.md to mark Task 8.1 as complete
- Overall progress: 15 tasks completed (Phase 1: 5, Phase 2: 5, Phase 4: 4, Phase 8: 1)
- Phase 8 progress: 20% (1/5 tasks)

### Technical
- Default theme: Dark (matches most trading platforms)
- Theme service auto-initializes on app start
- Observable pattern for theme change subscriptions
- Fallback to dark theme if localStorage unavailable



## [0.7.4] - 2025-10-04

### Added
- **Browser Notification Click Handling**: Enhanced notification interactivity
  - Clicking notification now focuses the browser window
  - Automatically navigates to /alerts page when notification clicked
  - Notification auto-closes after click
  - Added `requireInteraction` and `silent` notification options
  - Silent mode respects sound alert settings

### Changed
- Enhanced browser notification configuration with interaction options
- Updated angular.json budget limits to realistic values
  - Initial bundle: 500kB→1MB (warning), 1MB→2MB (error)
  - Component styles: 4kB→10kB (warning), 8kB→15kB (error)
- Updated TASKS.md to mark Task 4.4 as complete
- Overall progress: 14 tasks completed (Phase 1: 5, Phase 2: 5, Phase 4: 4)
- Phase 4 progress: 57% (4/7 tasks)
- Next priority: Task 4.5 (Email Notifications)

### Fixed
- Build errors from SCSS budget limits (alerts, risk-management, order-placement components)
- Build now succeeds with only CommonJS warning (crypto-js unavoidable)



## [0.7.3] - 2025-10-04

### Added
- **Indicator Alerts**: Complete technical indicator alert system
  - RSI threshold alerts (above/below)
  - RSI crossover alerts (cross above/below threshold)
  - MACD crossover alerts (bullish/bearish crossovers)
  - SMA crossover alerts (price crossing above/below SMA)
  - Bollinger Band breakout alerts (upper/lower band breakouts)
  - Volume spike alerts (already existed from 0.7.1)
  - Comprehensive indicator evaluation engine
  - Real-time indicator calculations (RSI, MACD, SMA, Bollinger Bands)
  - Alert message generation for all indicator types

### Changed
- Updated alert.service.ts with 6 new evaluation methods
- Added MACD calculation (EMA-based with signal line)
- Added SMA array calculation for crossover detection
- Added Bollinger Bands calculation (20-period, 2 std dev)
- Enhanced alert UI with organized optgroups for indicator types
- Updated TASKS.md to mark Task 4.3 as complete
- Overall progress: 13 tasks completed (Phase 1: 5, Phase 2: 5, Phase 4: 3)
- Phase 4 progress: 43% (3/7 tasks)
- Next priority: Task 4.4 (Browser Notifications)

### Technical
- RSI crossover detection with 2-period comparison
- MACD crossover detection comparing MACD line vs signal line
- SMA crossover detection comparing price vs SMA value
- Bollinger Band breakout detection with band penetration logic
- All calculations reuse existing candle data
- Minimum data requirements enforced (e.g., 35 candles for MACD)



## [0.7.2] - 2025-10-04

### Added
- **Price Alerts UI**: Comprehensive alert management interface
  - Alert creation form with multiple alert types (Price Above/Below, Cross Above/Below, Percentage Change)
  - Alert list with active/triggered/inactive status indicators
  - Quick create buttons for popular symbols
  - Alert editing and deletion functionality
  - Real-time current price display for reference
  - Alert history view with last 50 triggered alerts
  - Notification settings panel (browser, sound, popup, email)
  - Alert cooldown and rate limiting configuration
  - Active/History/Create/Settings tabbed interface
  - Empty states with helpful guidance
  - Responsive design for mobile/desktop
  - Color-coded alert cards (active=green, triggered=orange, inactive=gray)
  - Alert statistics dashboard (active count, triggered count, history count)

### Changed
- Updated TASKS.md to mark Task 4.2 (Price Alerts) as complete
- Overall progress: 12 tasks completed (Phase 1: 5, Phase 2: 5, Phase 4: 2)
- Phase 4 progress: 29% (2/7 tasks)
- Next priority: Task 4.3 (Indicator Alerts)

### Technical
- Created AlertsComponent with full CRUD operations
- Integrated with AlertService for backend functionality
- Support for 8 alert types (Price, RSI, Volume)
- localStorage persistence
- Browser notification integration



## [0.7.1] - 2025-10-04

### Verified
- **Alert System Core**: Verified pre-existing implementation of comprehensive alert system
  - Alert model with multiple alert types (price, indicator, volume, position, risk)
  - Alert service with full CRUD operations
  - localStorage persistence for alerts and history
  - Alert evaluation engine with 5-second monitoring interval
  - Alert triggering logic with cooldown and rate limiting
  - Alert history tracking (last 1000 entries)
  - Browser notifications with permission handling
  - Sound alerts and popup alerts
  - RSI, MACD, Volume spike evaluation
  - Price threshold and cross detection
  - Notification settings management

### Added
- Enhanced alert.model.ts with comprehensive TypeScript interfaces
  - AlertType enum (16 types)
  - AlertStatus enum (ACTIVE, TRIGGERED, DISABLED, EXPIRED)
  - AlertPriority enum (LOW, MEDIUM, HIGH, CRITICAL)
  - NotificationChannel enum (7 channels)
  - Full alert condition interface
  - Alert statistics interface
  - Alert template system

### Changed
- Updated TASKS.md to mark Task 4.1 (Alert System Core) as complete
- Overall progress: 11 tasks completed (Phase 1: 5, Phase 2: 5, Phase 4: 1)
- Phase 4 progress: 14% (1/7 tasks)
- Next priority: Task 4.2 (Price Alerts UI)



## [0.7.0] - 2025-10-04

### Added
- **Paper Trading Enhancement System**: Complete realistic trading simulator
  - **Slippage Simulation**: Three models (fixed, volume-based, volatility-based)
  - **Fee Calculation**: Maker/taker fees with configurable percentages
  - **Order Book Simulation**: Simulated order book with configurable depth
  - **Partial Fill Simulation**: Realistic partial order fills with 15% probability
  - **Latency Simulation**: Network delay simulation (50-300ms)
  - **Market Impact Simulation**: Price impact based on order size vs daily volume
- **Paper Trading Configuration UI**: Comprehensive settings panel
  - Tabbed interface for different simulation types
  - Real-time realism score (0-100) with visual indicator
  - Slider controls for all parameters
  - Toggle switches for enabling/disabling features
  - Save/reset configuration functionality
- **Order Service Integration**: Seamless paper/live trading mode switching
  - Automatic routing between paper and live orders
  - Paper trading mode toggle with localStorage persistence
  - Detailed simulation logging with slippage, fees, and market impact
  - Multiple fill generation for large orders

### Changed
- Updated OrderService to support paper trading mode
- Enhanced order execution with realistic simulations
- Updated TASKS.md to mark Phase 2 as 100% complete (5/5 tasks)
- Overall progress: 10 tasks completed

### Technical
- Phase 1: 100% Complete (Advanced Technical Indicators)
- Phase 2: 100% Complete (Advanced Trading Features) ✅
- All TypeScript builds successful



## [0.6.2] - 2025-10-04

### Added
- **Position Management UI**: Comprehensive dashboard for tracking positions with P&L metrics, position details modal, partial/full closing (1-100% slider), and Risk/Reward calculator
- **Risk Management Dashboard**: Real-time risk monitoring with portfolio risk score (0-100), 6 risk metrics cards (drawdown, daily P&L, positions, exposure, leverage, margin), risk alerts & violations system, configurable risk parameters, and emergency stop-all feature
- **Trailing Stop-Loss System**: Complete implementation with 3 types (Percentage, Fixed Amount, ATR-based), real-time monitoring every 2s, auto-trigger functionality, support for LONG/SHORT positions, optional activation price, and comprehensive alert system
- **Documentation**: ROADMAP_SUMMARY.md with comprehensive project overview and progress tracking

### Changed
- Updated README.md with expanded Features section and restructured Roadmap
- Updated TASKS.md to mark Tasks 2.1, 2.2, 2.3, and 2.4 as completed
- Phase 2 progress updated to 80% (4/5 tasks complete)

### Technical
- All TypeScript builds successful
- Phase 1: 100% Complete (Advanced Technical Indicators)
- Phase 2: 80% Complete (Order & Position & Risk & Trailing Stop Management)

## [0.6.1] - 2025-10-03



## [0.6.0] - 2025-10-03

### Changed
- **REBRANDING:** Project renamed from "Binance Trading System" to "AlgoTrader Pro"
- Updated all references to reflect new professional name
- Clarified multi-exchange support capability (currently Binance, expandable to others)
- Enhanced project description as "Professional Algorithmic Trading Platform"

## [0.5.6] - 2025-10-03

### Added
- Bollinger Bands indicator overlaid on main price chart
- Upper, middle, and lower bands visualization
- Configurable period (default 20) and standard deviation (default 2)
- Bollinger Band breakout signals (upper and lower band)
- Mean reversion signals (band bounce detection)
- Bollinger Bands support in backtesting service
- Bollinger Bands parameter editing in strategy manager UI

## [0.5.5] - 2025-10-03

### Added
- Choppiness Index indicator as separate pane
- Color-coded zones: Green (trending < 38.2), Orange (neutral), Red (choppy > 61.8)
- Configurable Choppiness period (default 14)
- Choppiness Index as signal filter to prevent trading in choppy markets
- Choppiness support in backtesting service
- Choppiness parameter editing in strategy manager UI

## [0.5.4] - 2025-10-03

### Added
- MACD (Moving Average Convergence Divergence) indicator as separate pane
- MACD line, signal line, and histogram visualization
- Configurable MACD periods (fast: 12, slow: 26, signal: 9)
- MACD crossover signal detection in strategy service
- MACD support in backtesting with bullish/bearish crossover signals
- MACD parameter editing in strategy manager UI

## [0.5.3] - 2025-10-03

### Fixed
- Chart markers now display correctly using Lightweight Charts v5 API
- Updated marker implementation from v4 setMarkers() to v5 createSeriesMarkers()
- Added required price property to all markers
- Fixed marker positioning and shapes with proper TypeScript types
- Backtesting chart markers now show entry/exit points with P&L



## [0.5.2] - 2025-10-03

### Added
- Strategy parameter editing in strategy manager
- Edit controls for RSI thresholds (oversold/overbought)
- Edit controls for Aroon period
- Toggle controls for SMA, SMA200, RSI, and Aroon indicators
- Styled parameter edit UI with responsive layout

### Fixed
- Deep copy strategy parameters when editing to prevent mutation
- Set sensible defaults for missing parameters (RSI: 30/70, Aroon: 25)



## [0.5.1] - 2025-10-03

### Added
- Aroon indicator as additional pane to chart
- Aroon Up and Aroon Down lines with configurable period (default 25)
- Strategy manager UI support for Aroon indicator
- Aroon period configuration in strategy parameters

## [0.5.0] - 2025-10-03



## [0.4.3] - 2025-10-03

### Added
- Comprehensive backtesting system with dedicated component and service
- Performance metrics including win rate, profit factor, Sharpe ratio, and max drawdown
- Visual backtesting results with equity curve overlay on price chart
- Trade history table showing entry/exit points and P&L for each trade
- Signal list showing all generated trading signals with indicator values
- Export functionality to save backtesting results as JSON
- Improved signal generation logic with configurable RSI thresholds
- Better bounds checking to prevent out-of-range errors in signal generation

### Fixed
- RSI Y-axis scale visibility on chart pane
- Signal display bugs with incorrect array indexing in SMA crossover detection
- Array bounds checking in RSI and SMA signal generation

## [0.4.2] - 2025-10-03



## [0.4.1] - 2025-10-03



## [0.4.0] - 2025-10-03

### Added
- SMA 200 indicator to the chart.
- RSI series integrated into the main chart as a new pane.

### Fixed
- Chart alignment issues between main and sub-chart by harmonizing timeScale and rightPriceScale options.
- TypeScript errors related to `setMarkers` and `pane` property in Lightweight Charts.
- Runtime error `TypeError: this.candlestickSeries.setMarkers is not a function`.

### Changed
- Removed RSI subchart and its related HTML/CSS.
- Adjusted chart-container flex property for better alignment.

## [0.3.0] - 2025-10-03

### Added
- Collapsible sections for dashboard components
- Strategy signal detection and display in local time
- RSI subchart with real-time updates

### Changed
- Optimized dashboard layout for better readability
- Moved version display to the navigation bar

### Fixed
- Improved RSI subchart reinitialization and cleanup
- Handled futures API 404 error gracefully in proxy server

### Docs
- Consolidated all documentation into a comprehensive README

## [0.2.0] - 2025-10-03

### Added
- Inline editing for trading strategies in dashboard
- Delete functionality for strategies with confirmation dialog

### Changed
- Improved dashboard table formatting with right-aligned columns
- Enhanced number formatting with German locale (thousands separator)

## [0.1.0] - 2025-10-03

### Added
- Complete cryptocurrency trading system with Angular 20 (supports Binance and other exchanges)
- Dashboard with account statistics, balances, positions, and orders
- Trading chart component with TradingView lightweight-charts
- Real-time WebSocket integration for live data
- Strategy management system with Pine Script support
- Proxy server for handling CORS and API authentication
- Environment configuration system with .env file support
- Auto-generated environment files from .env
- Comprehensive documentation (README, QUICK-START, PROXY-SERVER)
- Testnet and live mode support
- Scrollable tables with sticky headers
- Custom scrollbar styling
- Mock data for demo mode

### Changed
- Migrated from env-config.js to .env-based configuration for better security
- Updated table formatting with better number display
- Improved dashboard table scrollability (max-height: 400px)

### Fixed
- Lightweight-charts v5.x API compatibility
- CORS issues with proxy server implementation

### Security
- .env file excluded from git (added to .gitignore)
- Generated environment files excluded from version control
- API keys never committed to repository
- Comprehensive liability disclaimer and MIT license

## [0.0.0] - 2025-10-03

### Added
- Initial project setup
- Basic Angular 20 structure
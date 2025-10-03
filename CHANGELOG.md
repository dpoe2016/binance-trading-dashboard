# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Complete Binance trading system with Angular 20
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
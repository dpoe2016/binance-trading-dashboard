# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

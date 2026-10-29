# Universal Signal AI

A real-time technical analysis and crypto trading signal engine powered by Binance Spot market data.

## Features

- **Live Market Data**: Real-time candle fetching from Binance Spot for major crypto pairs (`BTCUSDT`, `ETHUSDT`, `BNBUSDT`, `SOLUSDT`, `XRPUSDT`, `DOGEUSDT`).
- **Multi-Timeframe Analysis**: Instant calculation across multiple timeframes (`1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`).
- **Indicator Engine**:
  - **EMA Crossovers**: Exponential Moving Averages 9, 21, and 50.
  - **RSI (14)**: Relative Strength Index for overbought/oversold momentum.
  - **MACD**: 12/26 EMA MACD line with 9 EMA signal line and histogram.
  - **Directional Voting**: Rule-based technical scoring for high-conviction BUY and SELL signals.
- **Interactive Visualizer**: Candlestick price chart with overlaid EMAs, RSI gauge, and MACD oscillator histograms.
- **Signal History & Alerts**: Session history tracking and synthesized audio alerts on new signals.

## Running Locally

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
npm start
```
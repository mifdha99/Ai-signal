import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json());

// Proxy endpoint for Binance Kline data with multiple fallback mirrors
app.get('/api/klines', async (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTCUSDT';
  const interval = (req.query.interval as string) || '5m';
  const limit = (req.query.limit as string) || '250';

  const mirrors = [
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api1.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api2.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`,
    `https://api3.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(limit)}`
  ];

  let lastError: Error | null = null;
  for (const url of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'UniversalSignalAI/2.0',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  return res.status(502).json({
    error: 'Gagal menghubungi seluruh server Binance mirror.',
    details: lastError?.message || 'Koneksi gagal atau timeout'
  });
});

// Proxy endpoint for Twelve Data (Forex, Stocks, Commodities, Indices)
app.get('/api/twelvedata', async (req, res) => {
  const symbol = req.query.symbol as string;
  const interval = (req.query.interval as string) || '5min';
  const outputsize = (req.query.outputsize as string) || '100';
  const apikey = (req.query.apikey as string) || process.env.TWELVE_DATA_API_KEY || '';

  if (!apikey) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'API Key Twelve Data diperlukan untuk instrumen ini. Masukkan API key pada menu Pengaturan.'
    });
  }

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${outputsize}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UniversalSignalAI/2.0',
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(504).json({
      status: 'error',
      code: 504,
      message: `Koneksi timeout ke Twelve Data: ${err.message}`
    });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');

const DEFAULT_PORT = 3001;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const FX_API_URL = process.env.FX_API_URL || 'https://open.er-api.com/v6/latest/USD';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd';
const BINANCE_P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
const STATE_FILE = path.join(__dirname, 'scripts', 'rate-snapshot.json');
const MANUAL_RATE_FILE = path.join(__dirname, 'scripts', 'manual-rate.json');

function log(level, message, extra = {}) {
    const timestamp = new Date().toISOString();
    const payload = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '';
    // eslint-disable-next-line no-console
    console.log(`[${timestamp}] [${level}] ${message}${payload}`);
}

const app = express();
app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        /^https:\/\/.*\.netlify\.app$/,  // Cho phép tất cả subdomain Netlify
        /^https:\/\/.*\.ngrok-free\.app$/  // Cho phép ngrok
    ],
    credentials: true
}));
app.use(express.json());

async function fetchUsdVndRate() {
    const response = await fetch(FX_API_URL);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error || data?.reason || `Status ${response.status}`);
    }
    const usdToVnd = data?.rates?.VND;
    const rate = parseFloat(usdToVnd);
    if (!rate || Number.isNaN(rate) || rate <= 0) {
        throw new Error('FX API returned invalid VND rate');
    }
    return rate;
}

async function fetchBinanceP2PRate() {
    try {
        // Lấy giá SELL (người bán USDT nhận VND)
        const sellResponse = await fetch(BINANCE_P2P_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                page: 1,
                rows: 10,
                tradeType: 'SELL',
                asset: 'USDT',
                fiat: 'VND',
                payTypes: []
            })
        });
        const sellData = await sellResponse.json();
        
        // Lấy giá BUY (người mua USDT trả VND)
        const buyResponse = await fetch(BINANCE_P2P_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                page: 1,
                rows: 10,
                tradeType: 'BUY',
                asset: 'USDT',
                fiat: 'VND',
                payTypes: []
            })
        });
        const buyData = await buyResponse.json();
        
        if (sellData?.data?.length && buyData?.data?.length) {
            // Lấy top 3 giá tốt nhất và tính trung bình để tránh giá bất thường
            const sellPrices = sellData.data.slice(0, 3).map(item => parseFloat(item.adv.price));
            const buyPrices = buyData.data.slice(0, 3).map(item => parseFloat(item.adv.price));
            
            const avgSellPrice = sellPrices.reduce((sum, p) => sum + p, 0) / sellPrices.length;
            const avgBuyPrice = buyPrices.reduce((sum, p) => sum + p, 0) / buyPrices.length;
            
            log('INFO', 'Fetched Binance P2P rates', { 
                sellPrice: avgSellPrice, 
                buyPrice: avgBuyPrice,
                sellPrices: sellPrices,
                buyPrices: buyPrices
            });
            
            return { 
                sellPrice: avgSellPrice, 
                buyPrice: avgBuyPrice,
                source: 'binance-p2p'
            };
        }
        throw new Error('Binance P2P API returned no data');
    } catch (err) {
        log('WARN', 'Binance P2P fetch failed, falling back', { error: err.message });
        throw err;
    }
}

async function fetchUsdtVndRateFromCoingecko() {
    try {
        // Lấy giá USDT/USD từ CoinGecko
        const usdtResponse = await fetch(COINGECKO_API_URL);
        const usdtData = await usdtResponse.json();
        if (!usdtResponse.ok || !usdtData?.tether?.usd) {
            throw new Error('CoinGecko USDT price not available');
        }
        const usdtToUsd = parseFloat(usdtData.tether.usd);
        
        // Lấy tỷ giá USD/VND từ FX API
        const fxResponse = await fetch(FX_API_URL);
        const fxData = await fxResponse.json();
        if (!fxResponse.ok || !fxData?.rates?.VND) {
            throw new Error('FX API VND rate not available');
        }
        const usdToVnd = parseFloat(fxData.rates.VND);
        
        // Tính USDT/VND = USDT/USD * USD/VND
        const spotRate = usdtToUsd * usdToVnd;
        
        // Sử dụng tỷ lệ so với giá spot để ước tính P2P
        const p2pAdjustment = parseFloat(process.env.P2P_ADJUSTMENT) || 1.0;
        const baseRate = spotRate * p2pAdjustment;
        
        const spreadPercent = parseFloat(process.env.P2P_SPREAD_PERCENT) || 0.3;
        const spreadAmount = baseRate * (spreadPercent / 100);
        
        const sellPrice = baseRate + (spreadAmount / 2);
        const buyPrice = baseRate - (spreadAmount / 2);
        
        return { sellPrice, buyPrice, source: 'coingecko-fx' };
    } catch (err) {
        log('WARN', 'CoinGecko fetch failed, using direct FX API', { error: err.message });
        const fxRate = await fetchUsdVndRate();
        const p2pAdjustment = parseFloat(process.env.P2P_ADJUSTMENT) || 1.0;
        const baseRate = fxRate * p2pAdjustment;
        const spreadPercent = parseFloat(process.env.P2P_SPREAD_PERCENT) || 0.3;
        const spreadAmount = baseRate * (spreadPercent / 100);
        return {
            sellPrice: baseRate + (spreadAmount / 2),
            buyPrice: baseRate - (spreadAmount / 2),
            source: 'fx-api'
        };
    }
}

async function loadAlertState() {
    try {
        const raw = await fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return {};
    }
}

async function loadManualRate() {
    try {
        const raw = await fs.readFile(MANUAL_RATE_FILE, 'utf8');
        const data = JSON.parse(raw);
        // Kiểm tra xem giá có còn hợp lệ không (không quá 7 ngày)
        if (data.timestamp) {
            const age = Date.now() - new Date(data.timestamp).getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 ngày
            if (age > maxAge) {
                log('WARN', 'Manual rate is too old, ignoring', { age: age / (24 * 60 * 60 * 1000) + ' days' });
                return null;
            }
        }
        return data;
    } catch (err) {
        return null;
    }
}

async function saveManualRate(sellPrice, buyPrice) {
    try {
        const data = {
            sellPrice: parseFloat(sellPrice),
            buyPrice: parseFloat(buyPrice),
            timestamp: new Date().toISOString(),
            source: 'manual'
        };
        await fs.writeFile(MANUAL_RATE_FILE, JSON.stringify(data, null, 2));
        log('INFO', 'Manual rate saved', data);
        return data;
    } catch (err) {
        log('ERROR', 'Failed to save manual rate', { error: err.message });
        throw err;
    }
}

app.get('/api/p2p-rate', async (req, res) => {
    let sellPrice = 0;
    let buyPrice = 0;
    let source = 'unknown';
    
    // Ưu tiên 1: Kiểm tra giá thủ công (nếu có và còn mới)
    const manualRate = await loadManualRate();
    if (manualRate && manualRate.sellPrice && manualRate.buyPrice) {
        sellPrice = manualRate.sellPrice;
        buyPrice = manualRate.buyPrice;
        source = 'manual';
        log('INFO', 'Using manual rate', { sellPrice, buyPrice });
        return res.json({
            sellPrice,
            buyPrice,
            lastFetchedAt: manualRate.timestamp,
            source
        });
    }
    
    // Ưu tiên 2: Lấy giá trực tiếp từ Binance P2P API (nguồn chính xác nhất)
    try {
        const p2pRates = await fetchBinanceP2PRate();
        sellPrice = p2pRates.sellPrice;
        buyPrice = p2pRates.buyPrice;
        source = p2pRates.source;
        log('INFO', 'Successfully fetched Binance P2P rates', { sellPrice, buyPrice });
        return res.json({
            sellPrice,
            buyPrice,
            lastFetchedAt: new Date().toISOString(),
            source
        });
    } catch (binanceErr) {
        log('WARN', 'Binance P2P method failed, trying CoinGecko+FX', { error: binanceErr.message });
        
        // Ưu tiên 3: Dùng CoinGecko + FX API để tính USDT/VND (fallback)
        try {
            const cgRates = await fetchUsdtVndRateFromCoingecko();
            sellPrice = cgRates.sellPrice;
            buyPrice = cgRates.buyPrice;
            source = cgRates.source;
            log('INFO', 'Successfully fetched rates from CoinGecko+FX', { sellPrice, buyPrice });
            return res.json({
                sellPrice,
                buyPrice,
                lastFetchedAt: new Date().toISOString(),
                source
            });
        } catch (cgErr) {
            log('ERROR', 'All rate providers failed', { 
                binanceError: binanceErr.message,
                coingeckoError: cgErr.message
            });
            return res.status(502).json({
                message: 'Unable to reach any rate provider',
                details: cgErr.message,
                attemptedSources: ['manual', 'binance-p2p', 'coingecko-fx', 'fx-api']
            });
        }
    }
});

app.get('/', (req, res) => {
    res.send('P2P rate proxy is running. Using Binance P2P API as primary source, with CoinGecko + FX API fallback.');
});

app.get('/api/p2p-rate/alert', async (req, res) => {
    try {
        const state = await loadAlertState();
        return res.json({
            lastCheckedAt: state.lastCheckedAt || state.timestamp || null,
            lastAlertAt: state.lastAlertAt || null,
            lastChangePercent: state.lastChangePercent ?? 0,
            thresholdPercent: state.thresholdPercent ?? 0,
            lastAlertChange: state.lastAlertChange ?? null,
            lastAlertRate: state.lastAlertRate ?? null
        });
    } catch (err) {
        log('ERROR', 'Failed to load alert state', { error: err.message });
        return res.status(500).json({ message: 'Alert state not available' });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'p2p-rate-proxy',
        timestamp: new Date().toISOString()
    });
});

// Endpoint để cập nhật giá thủ công
app.post('/api/p2p-rate/manual', express.json(), async (req, res) => {
    try {
        const { sellPrice, buyPrice } = req.body;
        if (!sellPrice || !buyPrice) {
            return res.status(400).json({ message: 'sellPrice and buyPrice are required' });
        }
        const data = await saveManualRate(sellPrice, buyPrice);
        return res.json({
            message: 'Manual rate saved successfully',
            data
        });
    } catch (err) {
        log('ERROR', 'Failed to save manual rate', { error: err.message });
        return res.status(500).json({ message: 'Failed to save manual rate', details: err.message });
    }
});

// Endpoint để xem giá thủ công hiện tại
app.get('/api/p2p-rate/manual', async (req, res) => {
    try {
        const manualRate = await loadManualRate();
        if (!manualRate) {
            return res.status(404).json({ message: 'No manual rate found' });
        }
        return res.json(manualRate);
    } catch (err) {
        return res.status(500).json({ message: 'Failed to load manual rate', details: err.message });
    }
});

app.listen(PORT, () => {
    log('INFO', `P2P rate proxy listening on port ${PORT}`);
    log('INFO', 'Using Binance P2P API as primary source, CoinGecko + FX API as fallback');
});

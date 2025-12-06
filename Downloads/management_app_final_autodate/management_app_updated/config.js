// API Configuration
// Cấu hình URL của backend P2P Rate Proxy

// Netlify Function (Production) - Ưu tiên cao nhất
window.NETLIFY_FUNCTION_URL = '/.netlify/functions/p2p-rate';

// Backend proxy (Optional - nếu có backend riêng)
// window.RATE_PROXY_URL = 'https://your-backend-url.com/api/p2p-rate';
window.RATE_PROXY_URL = null;

// Binance P2P API endpoint (Direct - có thể bị CORS)
window.BINANCE_P2P_API = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';

// Auto-refresh interval (milliseconds)
// Mặc định: 5 phút (5 * 60 * 1000)
window.P2P_REFRESH_INTERVAL = 5 * 60 * 1000;

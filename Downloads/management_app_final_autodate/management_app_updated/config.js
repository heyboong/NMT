// API Configuration
// Cấu hình URL của backend P2P Rate Proxy
// Để trống hoặc comment để sử dụng localhost:3000 khi chạy local

// Production backend URL (cập nhật URL này khi deploy backend lên server)
// Ví dụ: 'https://your-backend.herokuapp.com' hoặc 'https://your-backend.railway.app'
window.RATE_PROXY_URL = 'http://localhost:3000/api/p2p-rate';

// Nếu bạn đã deploy backend, thay đổi thành URL của backend
// window.RATE_PROXY_URL = 'https://your-backend-url.com/api/p2p-rate';

// Auto-refresh interval (milliseconds)
// Mặc định: 10 phút (10 * 60 * 1000)
window.P2P_REFRESH_INTERVAL = 10 * 60 * 1000;

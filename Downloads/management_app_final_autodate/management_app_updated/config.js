// API Configuration
// Cấu hình URL của backend P2P Rate Proxy
// Để trống hoặc comment để sử dụng localhost:3001 khi chạy local

// Production backend URL (cập nhật URL này khi deploy backend lên server)
// Ví dụ: 'https://your-backend.herokuapp.com' hoặc 'https://your-backend.railway.app'
window.RATE_PROXY_URL = '';

// Nếu bạn đã deploy backend, thay đổi thành URL của backend
// window.RATE_PROXY_URL = 'https://your-backend-url.com';

// Auto-refresh interval (milliseconds)
// Mặc định: 5 phút (5 * 60 * 1000)
window.P2P_REFRESH_INTERVAL = 5 * 60 * 1000;

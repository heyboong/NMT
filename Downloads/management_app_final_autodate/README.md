# Hệ Thống Quản Lý Offline

## Khởi động hệ thống

### Cách 1: Sử dụng Docker Compose (Khuyến nghị)

1. **Khởi động tất cả các service:**
   ```powershell
   # PowerShell
   docker-compose up -d
   
   # Hoặc CMD/Bash
   docker-compose up -d
   ```

2. **Xem logs để kiểm tra:**
   ```powershell
   docker-compose logs -f
   ```

3. **Kiểm tra trạng thái:**
   ```powershell
   docker-compose ps
   ```

4. **Dừng hệ thống:**
   ```powershell
   docker-compose down
   ```

5. **Khởi động lại hệ thống:**
   ```powershell
   docker-compose restart
   ```

6. **Khởi động lại từ đầu (nếu cần):**
   ```powershell
   docker-compose down
   docker-compose up -d
   ```

### Cách 2: Chạy thủ công

#### Backend (P2P Rate Proxy)

1. Vào thư mục backend:
   ```bash
   cd backend
   ```

2. Cài đặt dependencies (nếu chưa có):
   ```bash
   npm install
   ```

3. Khởi động backend:
   ```bash
   npm start
   ```
   
   Backend sẽ chạy tại: `http://localhost:3001`

#### Frontend

1. Mở file `management_app_updated/index.html` trực tiếp trong trình duyệt, hoặc

2. Sử dụng một web server đơn giản (ví dụ Python):
   ```bash
   cd management_app_updated
   python -m http.server 8080
   ```

3. Truy cập: `http://localhost:8080`

## Truy cập hệ thống

Sau khi khởi động, truy cập các URL sau:

- **Frontend (Web UI):** http://localhost:8080
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **P2P Rate API:** http://localhost:3001/api/p2p-rate

## Kiểm tra kết nối

### Kiểm tra Backend

```bash
curl http://localhost:3001/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "service": "p2p-rate-proxy",
  "timestamp": "..."
}
```

### Kiểm tra Frontend

Mở trình duyệt và truy cập: http://localhost:8080

Bạn sẽ thấy trang chủ với menu điều hướng đến các trang:
- Dashboard
- Bảng AE
- AE QTri
- Lịch sử
- Tỷ giá
- Quản Lý Hệ Thống

## Xử lý sự cố

### Port đã được sử dụng

Nếu gặp lỗi port đã được sử dụng:

1. **Kiểm tra process đang chạy (Windows PowerShell):**
   ```powershell
   netstat -ano | findstr :3001
   netstat -ano | findstr :8080
   ```

2. **Dừng process (Windows):**
   ```powershell
   taskkill /PID <process_id> /F
   ```

3. **Hoặc dừng Docker containers:**
   ```powershell
   docker-compose down
   ```

### Backend không kết nối được

1. Kiểm tra backend có đang chạy:
   ```bash
   curl http://localhost:3001/health
   ```

2. Kiểm tra logs:
   ```bash
   docker-compose logs p2p-rate-proxy
   ```

3. Kiểm tra file `.env` trong thư mục `backend` (nếu có)

### Frontend không load được

1. Kiểm tra console của trình duyệt (F12) để xem lỗi
2. Kiểm tra Network tab để xem các request có thành công không
3. Đảm bảo backend đang chạy và có thể truy cập được

## Cấu trúc thư mục

```
management_app_final_autodate/
├── backend/                 # Backend Node.js (P2P Rate Proxy)
│   ├── p2p-rate-proxy.js   # Main server file
│   ├── package.json
│   └── scripts/            # Scripts hỗ trợ
├── management_app_updated/ # Frontend (HTML/CSS/JS)
│   ├── index.html
│   ├── dashboard.html
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   └── nginx.conf          # Nginx config cho Docker
└── docker-compose.yml      # Docker Compose config
```

## Tính năng chính

- ✅ Quản lý dữ liệu AE và AE-QT
- ✅ Dashboard tổng quan với các bảng tổng
- ✅ Quản lý tỷ giá USDT/VND với API tự động
- ✅ Lịch sử giao dịch
- ✅ Quản lý hệ thống với danh mục tùy chỉnh
- ✅ Tùy chỉnh kích thước cột (resize trái/phải)
- ✅ Format tiền tệ rõ ràng (VND, USD, USDT)
- ✅ Hiển thị danh mục tùy chỉnh trên nhiều trang

## Lưu ý

- Dữ liệu được lưu trong localStorage của trình duyệt
- Backend chỉ cần thiết cho tính năng tỷ giá P2P
- Có thể chạy frontend độc lập (offline mode) nếu không cần tỷ giá real-time


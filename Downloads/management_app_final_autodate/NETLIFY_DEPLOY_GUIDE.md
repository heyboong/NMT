# 🚀 Hướng dẫn Deploy lên Netlify

## 📋 Yêu cầu
- Tài khoản GitHub (đã có: `heyboong/NMT`)
- Tài khoản Netlify (miễn phí)

## 🔧 Bước 1: Chuẩn bị Repository

✅ **ĐÃ HOÀN THÀNH** - Code đã được push lên GitHub:
- Repository: `https://github.com/heyboong/NMT`
- Branch: `master`

## 🌐 Bước 2: Deploy lên Netlify

### Phương pháp 1: Deploy qua Netlify Dashboard (Khuyến nghị)

1. **Đăng nhập Netlify**
   - Truy cập: https://app.netlify.com
   - Đăng nhập bằng tài khoản GitHub

2. **Tạo site mới**
   - Click **"Add new site"** > **"Import an existing project"**
   - Chọn **"Deploy with GitHub"**
   - Chọn repository **"heyboong/NMT"**

3. **Cấu hình Build Settings**
   ```
   Base directory: management_app_updated
   Build command: (để trống hoặc: echo 'No build needed')
   Publish directory: management_app_updated
   ```

4. **Deploy**
   - Click **"Deploy site"**
   - Đợi 1-2 phút để Netlify deploy
   - Site sẽ có URL dạng: `https://random-name-123.netlify.app`

5. **Đổi tên site (tùy chọn)**
   - Vào **"Site settings"** > **"Change site name"**
   - Đặt tên như: `nmt-finance-management`
   - URL mới: `https://nmt-finance-management.netlify.app`

### Phương pháp 2: Deploy bằng Netlify CLI

```bash
# Cài đặt Netlify CLI
npm install -g netlify-cli

# Đăng nhập
netlify login

# Deploy
cd c:\Downloads\management_app_final_autodate\management_app_updated
netlify deploy --prod
```

## ⚙️ Bước 3: Cấu hình Environment Variables (Nếu cần)

Nếu bạn có backend API, cần cấu hình:

1. Vào **Site settings** > **Environment variables**
2. Thêm biến:
   ```
   RATE_PROXY_URL = https://your-backend-url.com/api/p2p-rate
   ```

## 🔄 Bước 4: Tự động Deploy (CI/CD)

Netlify đã tự động cấu hình:
- Mỗi khi push code lên GitHub branch `master`
- Netlify sẽ tự động build và deploy
- Không cần làm gì thêm!

## 📁 Cấu hình File

### File đã có sẵn:

**netlify.toml**
```toml
[build]
  publish = "."
  command = "echo 'No build needed - static site'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**_redirects**
```
/*    /index.html   200
```

## ✅ Kiểm tra sau Deploy

1. **Kiểm tra trang chủ**: `https://your-site.netlify.app`
2. **Kiểm tra các trang**:
   - `/dashboard.html`
   - `/AE.html`
   - `/AE-QT.html`
   - `/usdt-purchase.html`
   - `/rate.html`
   - `/settings.html`

3. **Kiểm tra P2P Rate**:
   - Mở trang chủ
   - Kiểm tra "Giá P2P mới nhất" có hiển thị
   - Xem Console log (F12) để kiểm tra API call

## 🐛 Khắc phục Lỗi

### Lỗi 404 khi refresh trang
- ✅ Đã có file `_redirects` và `netlify.toml`

### P2P Rate không load
- Kiểm tra CORS của backend
- Kiểm tra URL backend trong `config.js`
- Xem Console log (F12) để debug

### LocalStorage không hoạt động
- Kiểm tra HTTPS (Netlify mặc định dùng HTTPS)
- Clear browser cache và cookies

## 🔐 Custom Domain (Tùy chọn)

1. Vào **Domain settings** > **Add custom domain**
2. Nhập domain của bạn (VD: `finance.yourdomain.com`)
3. Cấu hình DNS theo hướng dẫn của Netlify
4. Netlify tự động cấp SSL certificate (HTTPS)

## 📊 Theo dõi

- **Analytics**: Site settings > Analytics
- **Deploy log**: Deploys > Click vào deploy > View deploy log
- **Build time**: Thường < 1 phút cho static site

## 🎯 URL Deploy

Sau khi deploy xong, bạn sẽ có:
- **URL Netlify**: `https://your-site-name.netlify.app`
- **GitHub**: `https://github.com/heyboong/NMT`

## 💡 Lưu ý

1. **Miễn phí**: Netlify Free plan đủ cho project này
2. **Băng thông**: 100GB/tháng (Free plan)
3. **Build time**: 300 phút/tháng (Free plan)
4. **Tự động deploy**: Mỗi lần push code
5. **HTTPS**: Tự động kích hoạt

## 🔧 Backend API

Nếu bạn cần deploy backend (Node.js):
- Xem file: `backend/PROXY_SETUP.md`
- Khuyến nghị: Railway.app, Render.com, hoặc Heroku
- Sau khi deploy backend, cập nhật URL trong `config.js`

---

## 🎉 Hoàn thành!

Site của bạn đã sẵn sàng trên Netlify với các tính năng:
- ✅ Tự động cập nhật P2P rate
- ✅ LocalStorage + Supabase sync
- ✅ HTTPS miễn phí
- ✅ Tự động deploy từ GitHub
- ✅ Fast CDN global

**Chúc mừng! 🎊**

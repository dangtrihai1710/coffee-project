# Coffee Care - Ứng dụng Chẩn đoán Bệnh Cây Cà Phê

<div align="center">
  <img src="https://i.ibb.co/DH0SBtRN/image-removebg-preview.png" alt="Coffee Care Logo" width="150" height="150"/>
  <h3>Phát hiện và chẩn đoán bệnh cây cà phê sử dụng AI</h3>
</div>

## 📋 Tổng quan

Coffee Care là ứng dụng di động sử dụng trí tuệ nhân tạo (AI) giúp nông dân và chuyên gia nông nghiệp phát hiện, chẩn đoán và quản lý các bệnh phổ biến trên cây cà phê. Ứng dụng sử dụng công nghệ thị giác máy tính và học sâu để phân tích hình ảnh lá cà phê và cung cấp thông tin chi tiết về tình trạng sức khỏe cây trồng.

### Các tính năng chính
- **Quét và Phân tích**: Chụp ảnh hoặc chọn từ thư viện để phân tích tình trạng lá cà phê
- **Chẩn đoán Thông minh**: Nhận dạng các bệnh phổ biến như gỉ sắt, miner, phoma, và cercospora
- **Trợ lý AI**: Tư vấn về cách điều trị và quản lý bệnh cây cà phê
- **Lịch sử Quét**: Lưu trữ và theo dõi lịch sử quét của bạn để giám sát tình trạng cây theo thời gian
- **Hướng dẫn Điều trị**: Thông tin chi tiết về các phương pháp điều trị cho từng loại bệnh
- **Hoạt động Offline**: Phần lớn chức năng vẫn hoạt động khi không có kết nối internet

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Android 7.0 hoặc cao hơn
- iOS 13.0 hoặc cao hơn
- Bộ nhớ trống tối thiểu 100MB
- Camera có độ phân giải tối thiểu 5MP

### Tải ứng dụng
- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=com.coffeecare)
- **iOS**: [App Store](https://apps.apple.com/app/coffee-care/id123456789)
- **APK trực tiếp**: [Tải về từ Releases](https://github.com/username/coffee-care/releases)

## 💻 Cài đặt môi trường phát triển

### Yêu cầu
- Node.js (v14 hoặc cao hơn)
- npm hoặc yarn
- Expo CLI
- Python 3.8 hoặc cao hơn (cho backend)
- Android Studio hoặc Xcode (tùy chọn, để chạy trên giả lập)

### Cài đặt frontend (React Native)
```bash
# Clone repository
git clone https://github.com/username/coffee-care.git
cd coffee-care/coffee-rn

# Cài đặt các dependencies
npm install
# hoặc
yarn install

# Chạy ứng dụng
npx expo start
```

### Cài đặt backend (Python Flask)
```bash
# Đi đến thư mục backend
cd backend

# Tạo môi trường ảo
python -m venv venv

# Kích hoạt môi trường ảo
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# Cài đặt các dependencies
pip install -r requirements.txt

# Chạy server
python app.py
```

## 📱 Hướng dẫn sử dụng

### Phân tích lá cà phê
1. Mở ứng dụng và chọn tab "Quét"
2. Nhấn nút "Chụp ảnh" hoặc "Thư viện" để lấy hình ảnh lá cà phê
3. Đảm bảo lá nằm trọn trong khung hình và có ánh sáng tốt
4. Nhấn "Nhận diện" để phân tích ảnh
5. Xem kết quả phân tích và các đề xuất điều trị

### Sử dụng Trợ lý AI
1. Chuyển đến tab "Tư vấn"
2. Bạn có thể:
   - Chọn "Phân tích dữ liệu quét của tôi" để nhận phân tích tổng hợp
   - Hỏi trực tiếp về cách xử lý các loại bệnh cụ thể
   - Tham khảo các câu hỏi được gợi ý

### Xem thông tin điều trị
1. Chuyển đến tab "Điều trị"
2. Chọn loại bệnh cần xem thông tin
3. Xem chi tiết về triệu chứng, phương pháp điều trị và phòng ngừa

### Lịch sử quét
1. Chuyển đến tab "Lịch sử"
2. Xem lại tất cả các lần quét trước đó
3. Nhấn vào mục để xem chi tiết kết quả
4. Sử dụng các bộ lọc để tìm kiếm theo ngày hoặc loại bệnh

## 📸 Mẹo chụp ảnh tốt
- Chụp trong điều kiện ánh sáng tự nhiên
- Giữ máy ảnh ổn định, tránh rung lắc
- Chụp cận cảnh, lấy nét vào lá
- Đặt lá trên nền đối lập để dễ nhận diện
- Chụp cả mặt trên và mặt dưới của lá nếu có thể

## 🧠 Mô hình AI sử dụng
Ứng dụng sử dụng mô hình ResNet50 được tùy chỉnh, huấn luyện trên tập dữ liệu hơn 5000 hình ảnh lá cà phê với độ chính xác 97.09% cho 5 loại bệnh phổ biến. Mô hình được tối ưu hóa để chạy trên thiết bị di động với thời gian xử lý dưới 3 giây.

## 🤝 Đóng góp
Chúng tôi rất hoan nghênh các đóng góp! Nếu bạn muốn đóng góp, vui lòng:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi của bạn (`git commit -m 'Add amazing feature'`)
4. Push đến branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## 📄 Giấy phép
Dự án được phân phối dưới giấy phép MIT. Xem `LICENSE` để biết thêm thông tin.

## 📞 Liên hệ
- Email: contact@coffeecare.app
- Website: https://coffeecare.app

---

<div align="center">
  <p>Phát triển bởi Đặng Trí Hải và Hoàng Đức Hạnh</p>
  <p>Đại học Công nghệ TP.HCM (HUTECH)</p>
</div>

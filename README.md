# Hướng dẫn tích hợp API và Deploy Web Demo lên Vercel

Dự án này là Web Demo dành cho bài kiểm tra **Object Detection & OCR System for Engineering Drawings**. Nó sử dụng HTML/CSS/JS thuần để tối đa hoá sự nhẹ nhàng và dễ tích hợp. Giao diện được thiết kế theo phong cách Dark Mode hiện đại.

## 1. Hướng dẫn tích hợp Model API của bạn

Hiện tại, trang web đang sử dụng dữ liệu JSON Mock (giả lập) ở file `script.js`. Để web có thể thực sự gửi ảnh tới Model Detection của bạn, hãy làm theo các bước sau:

1. **Khởi chạy API Backend cho Model:**
   Đảm bảo model Python (YOLO, Detectron2, v.v.) của bạn đã được wrap lại bằng FastAPI hoặc Flask, và đang chạy trên IP công khai hoặc Localhost (Vd: `http://localhost:8000/detect`).
   *Lưu ý: Bạn phải cấu hình CORS cho Backend để cho phép Web (Frontend) gọi API.*

2. **Chỉnh sửa file `script.js`:**
   Mở file `script.js`, tìm đến hàm `runDetectionPipeline()`. Hãy xoá đoạn code MÔ PHỎNG và thay bằng mã fetch sau:

   ```javascript
   // ================= MÃ THỰC TẾ =================
   const formData = new FormData();
   formData.append("file", uploadedFile);

   // Đổi URL này thành URL API thực của model bạn
   const response = await fetch("http://localhost:8000/detect", { 
       method: "POST",
       body: formData
   });
   
   if (!response.ok) {
       throw new Error("Lỗi gọi API");
   }

   const resultData = await response.json();
   // ===============================================
   ```

## 2. Hướng dẫn Deploy lên Vercel miễn phí

Vercel là một nền tảng tuyệt vời để host các ứng dụng Web Frontend / Static site. Vì chúng ta không sử dụng framework nặng nề, quá trình deploy sẽ mất chưa đến 1 phút.

### Yêu cầu ban đầu
- Tài khoản [GitHub](https://github.com/) 
- Tài khoản [Vercel](https://vercel.com/) (Có thể đăng nhập bằng GitHub)

### Bước 1: Đẩy mã nguồn lên GitHub
1. Mở terminal, điều hướng vào thư mục `web-demo`.
2. Gõ các lệnh sau để khởi tạo Git và đẩy code lên:
   ```bash
   git init
   git add .
   git commit -m "Initial commit Web Demo"
   git branch -M main
   ```
3. Truy cập GitHub, tạo một Repository mới (ví dụ: `cv-assessment-demo`).
4. Link repository và đẩy code lên:
   ```bash
   git remote add origin https://github.com/TÊN_USER/TÊN_REPO.git
   git push -u origin main
   ```

### Bước 2: Deploy từ Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard).
2. Click vào nút **"Add New..."** ở góc phải và chọn **"Project"**.
3. Trong phần *Import Git Repository*, bạn sẽ thấy repo `cv-assessment-demo` vừa push. Nhấn nút **"Import"**.
4. Chọn Framework Preset là **"Other"** (Vì đây là HTML thuần).
5. Để mọi cấu hình mặc định, nhấn **"Deploy"**.
6. Đợi 10 giây. Vercel sẽ cấp cho bạn một URL public (VD: `cv-demo-abcxyz.vercel.app`).
   
🎉 Xin chúc mừng, bạn đã deploy thành công! Bạn có thể copy URL này nộp vào bài Test.

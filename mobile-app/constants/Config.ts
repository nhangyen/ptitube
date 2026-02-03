// Sử dụng IP máy tính của bạn (chạy `ipconfig` để xem)
// - 10.0.2.2: Dùng cho Android Emulator
// - 10.3.252.224: IP thực của máy (dùng cho thiết bị thật/Expo Go)
// - localhost: Chỉ hoạt động trên web

const HOST_IP = "192.168.137.1"; // Thay bằng IP của bạn nếu khác
export const API_BASE_URL = `http://${HOST_IP}:8080/api`;
export const API_TIMEOUT = 15000; // 15 seconds timeout

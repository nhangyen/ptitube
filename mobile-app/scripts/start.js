const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const configPath = path.join(__dirname, '../constants/Config.ts');

try {
  const configContent = fs.readFileSync(configPath, 'utf8');
  // Tìm kiếm `const HOST_IP = "..."` hoặc `const HOST_IP='...'` hoặc `const HOST_IP = '...'`
  const ipMatch = configContent.match(/const\s+HOST_IP\s*=\s*(['"])([^'"]+)\1/);
  
  if (ipMatch && ipMatch[2]) {
    const hostIp = ipMatch[2];
    console.log(`\n\x1b[32m[Expo Custom Start]\x1b[0m Đã tìm thấy HOST_IP trong Config.ts: \x1b[36m${hostIp}\x1b[0m`);
    // Gán biến môi trường cho quá trình tiếp theo
    process.env.REACT_NATIVE_PACKAGER_HOSTNAME = hostIp;
  } else {
    console.warn(`\n\x1b[33m[Expo Custom Start]\x1b[0m Không tìm thấy biến HOST_IP trong Config.ts, sử dụng mặc định.\n`);
  }
} catch (err) {
  console.warn(`\n\x1b[31m[Expo Custom Start]\x1b[0m Lỗi khi đọc file Config.ts:\n`, err.message);
}

// Bắt các đối số được truyền vào npm start (VD: npm start -- -c)
const args = process.argv.slice(2);

// Khởi chạy expo start
const expoProcess = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env // Truyền biến môi trường đã được gắn REACT_NATIVE_PACKAGER_HOSTNAME
});

expoProcess.on('close', (code) => {
  process.exit(code);
});

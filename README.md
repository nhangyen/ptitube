# PTiTube – Short‑Video Social Network

## 📖 Overview
A lightweight TikTok‑style video sharing platform built with:
- **Backend** – Spring Boot 3 (Java 17)
- **Mobile App** – React Native (Expo)
- **Infrastructure** – Docker Compose (PostgreSQL 15, MinIO)

The project demonstrates a full‑stack architecture, AI‑powered recommendation, and modern DevOps practices.

---

## 🏗 System Architecture
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Java Spring Boot 3 | REST API, authentication, video upload, recommendation engine |
| **Mobile App** | React Native (Expo) | Cross‑platform iOS/Android client |
| **Database** | PostgreSQL 15 | Persistent storage for users, videos, metadata |
| **Object Storage** | MinIO (S3‑compatible) | Stores video files |
| **Orchestration** | Docker Compose | Spins up all services together |

---

## 🚀 Getting Started
### Prerequisites
- Docker Desktop (running)
- Node.js v18+ (npm or yarn)
- (Optional) Java JDK 17 for backend development
- Android Studio / Xcode **or** Expo Go on a real device

### Launch the stack
```bash
# From the project root
docker-compose up -d --build
```
The command starts three containers:
- `video-db` – PostgreSQL (port 5432)
- `video-minio` – MinIO (ports 9000 / 9001)
- `video-backend` – Spring Boot API (port 8080)

#### Verify services
- API health: <http://localhost:8080/api/videos>
- MinIO console: <http://localhost:9001> (user: `minio_admin`, pass: `minio_password`)

---

## 📱 Mobile App
```bash
cd mobile-app
npm install
# Update the host IP (LAN address) in src/constants/Config.ts
npm start   # runs Expo Go
```
> **Tip:** Use a real device or an emulator. Do **not** use `localhost` in `Config.ts`; set it to your machine’s LAN IP (e.g., `192.168.1.42`).

---

## 📚 API Endpoints (selected)
| Category | Method | Path | Description |
|----------|--------|------|-------------|
| **Auth** | `POST` | `/api/auth/register` | Register a new user |
|          | `POST` | `/api/auth/login`    | Login and receive JWT |
| **Videos**| `POST` | `/api/videos/upload` | Upload a video (multipart) |
|          | `GET`  | `/api/videos`        | Retrieve feed (random or AI‑powered) |
|          | `GET`  | `/api/videos/stream/{id}` | Stream video with byte‑range support |

---

## 🛠 Troubleshooting
1. **Mobile App – Network Error**
   - Ensure the phone and the computer are on the same Wi‑Fi network.
   - Open firewall port 8080 or disable the firewall temporarily.
   - Verify `HOST_IP` in `mobile-app/src/constants/Config.ts` points to your LAN IP.
2. **Database & Enum Mismatch**
   - The DB schema now uses `VARCHAR` with check constraints instead of native enums.
   - If you see `column "role" is of type user_role …`, run:
     ```bash
     docker-compose down -v
     docker-compose up -d --build
     ```
3. **Port Conflict (MinIO Console)**
   - Error `bind: An attempt was made to access a socket …` means port 9001 is already in use.
   - Edit `docker-compose.yml` to change `9001` to an unused port (e.g., `9002`).
4. **Reset Data & Storage**
   ```bash
   docker-compose down -v   # removes volumes (DB + MinIO data)
   docker-compose up -d --build
   ```

---

## 🔧 Code Fixes Summary (Backend)
- Added constants `REPOST_BASE_BOOST` and `SELF_REPOST_BOOST`.
- Implemented `calculateScore` to compute a video’s ranking based on likes, views, comments, reposts, and freshness.
- Updated all `convertToFeedItem` calls to pass a `FeedCandidate` (including the calculated score) instead of raw `Video` + score.
- Adjusted random and AI feed pipelines to use `FeedCandidate.original` with the computed score.
- Fixed compilation errors related to the above changes.

---

## 🛡 Technical Highlights
- **UUID v4** for all primary keys (security & scalability).
- **Database triggers** for automatic `search_vector` updates (full‑text search) and statistics aggregation (`like_count`, `view_count`).
- **MinIO** provides S3‑compatible object storage for large video files.

---

## 📂 Project Structure
```
ptitube/
├─ backend/            # Spring Boot source code
│  ├─ src/main/java/...   # Controllers, services, models
│  ├─ Dockerfile
│  └─ pom.xml
├─ mobile-app/         # React Native source code
│  ├─ src/...
│  └─ package.json
├─ database/           # SQL initialization scripts
├─ docker-compose.yml  # Docker orchestration
└─ README.md           # This document
```
---

*Happy coding!*

# Database Architecture - Short Video Application

## Overview
This database is designed for a high-performance MVP of a short video sharing application using PostgreSQL 15.

## Design Decisions
1.  **UUIDs for Primary Keys**: Uses `uuid-ossp` to generate unique identifiers (v4). This is better for distributed systems and hides sequential ID information.
2.  **Naming Convention**: strict `snake_case` for all tables and columns.
3.  **Cascading Deletes**: `ON DELETE CASCADE` is used on Foreign Keys to ensure data consistency (e.g., deleting a User deletes their Videos, Likes, etc.).
4.  **Optimized Searching**:
    -   `GIN` index on `search_vector` for full-text search.
    -   Triggers automatically update the search vector when title/description changes.
5.  **Performance Patterns**:
    -   **Write-Behind Aggregation**: `video_stats` table stores counters (`like_count`, etc.) to avoid expensive `COUNT(*)` queries on the fly. Triggers maintain these counters.
    -   **One-to-One Separation**: `video_stats` is separated from `videos` to reduce contention on the main metadata table during heavy read/write of stats.

## Schema Details

### Core Tables
-   `users`: Stores user credentials and profile info.
-   `videos`: Stores video metadata and processing status.
-   `video_stats`: Aggregated counters for high-read performance.

### Social Logic
-   `follows`: User-to-User graph (Many-to-Many).
-   `likes`: User-to-Video interactions (Many-to-Many).
-   `comments`: Nested comments using an Adjacency List pattern (`parent_id`).

### Analytics & Moderation
-   `video_views`: Logs granular view events for analytics. Includes `device_info` as JSONB for flexibility.
-   `reports`: User moderation queue.

## Setup
The schema is automatically applied via the `init.sql` script mounted to `/docker-entrypoint-initdb.d` in the Docker container.

### How to Run
```bash
docker-compose up -d db
```
The database will be available on port `5432` with:
-   **DB**: `video_db`
-   **User**: `video_user`
-   **Password**: `video_password`

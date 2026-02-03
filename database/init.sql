-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMs
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_status AS ENUM ('pending', 'active', 'failed', 'banned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    bio TEXT,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Videos Table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    duration_seconds INTEGER,
    format VARCHAR(20),
    file_size BIGINT,
    status video_status DEFAULT 'pending',
    search_vector TSVECTOR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Video Stats Table (1-1 with Videos)
CREATE TABLE IF NOT EXISTS video_stats (
    video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    view_count BIGINT DEFAULT 0,
    like_count BIGINT DEFAULT 0,
    comment_count BIGINT DEFAULT 0,
    share_count BIGINT DEFAULT 0
);

-- Follows Table (M-M Users)
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- Likes Table (M-M User-Video)
CREATE TABLE IF NOT EXISTS likes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id)
);

-- Comments Table (Nested)
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Video Views (Analytics)
CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for viewing without login
    watch_duration INTEGER NOT NULL, -- in seconds
    is_completed BOOLEAN DEFAULT FALSE,
    device_info JSONB,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user ON video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_video ON reports(video_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- GIN Index for Full Text Search
CREATE INDEX IF NOT EXISTS idx_videos_search ON videos USING GIN(search_vector);

-- Triggers

-- 1. Automating search_vector update
CREATE OR REPLACE FUNCTION videos_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                         setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_videos_search_update ON videos;
CREATE TRIGGER trg_videos_search_update
BEFORE INSERT OR UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION videos_search_vector_update();

-- 2. Automating like_count update (Write-behind pattern)
CREATE OR REPLACE FUNCTION update_video_like_count() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE video_stats SET like_count = like_count + 1 WHERE video_id = NEW.video_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE video_stats SET like_count = like_count - 1 WHERE video_id = OLD.video_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_likes ON likes;
CREATE TRIGGER trg_update_likes
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_video_like_count();

-- 3. Auto-create video_stats when a video is created
CREATE OR REPLACE FUNCTION init_video_stats() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO video_stats (video_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_video_stats ON videos;
CREATE TRIGGER trg_init_video_stats
AFTER INSERT ON videos
FOR EACH ROW EXECUTE FUNCTION init_video_stats();

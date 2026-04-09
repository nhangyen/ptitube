import axios from 'axios';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/Config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

let authToken: string | null = null;

export interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
}

export interface VideoUserSummary {
  id: string;
  username: string;
  avatarUrl?: string;
  followedByCurrentUser?: boolean;
}

export interface VideoItem {
  id: string;
  feedEntryId?: string;
  entryType?: 'original' | 'repost';
  videoUrl: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  score?: number;
  createdAt?: string;
  activityAt?: string;
  repostedAt?: string;
  user: VideoUserSummary;
  repostedBy?: VideoUserSummary;
  stats?: VideoStats;
  hashtags?: string[];
  likedByCurrentUser?: boolean;
  currentUserHasReposted?: boolean;
}

export interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  replies?: CommentItem[];
}

export interface ProfileData {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  verified?: boolean;
  currentUser?: boolean;
  joinedAt?: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  totalLikes: number;
  followedByCurrentUser?: boolean;
}

export interface UserCard {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  followerCount: number;
  videoCount: number;
  followedByCurrentUser?: boolean;
}

export interface HashtagItem {
  name: string;
  displayName: string;
  videoCount: number;
}

export interface DiscoverData {
  featuredVideos: VideoItem[];
  trendingHashtags: HashtagItem[];
  suggestedCreators: UserCard[];
}

export interface SearchResults {
  query: string;
  videos: VideoItem[];
  users: UserCard[];
  hashtags: HashtagItem[];
}

export interface HashtagDetail {
  hashtag: HashtagItem;
  videos: VideoItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  videoId?: string;
  videoTitle?: string;
  videoThumbnailUrl?: string;
  commentId?: string;
}

export interface DashboardData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalVideos: number;
  followerCount: number;
  engagementRate: number;
  topVideos: Array<{
    videoId: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
  }>;
}

export interface AuthPayload {
  id: string;
  token: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const getAuthToken = () => authToken;

export const login = async (username: string, password: string): Promise<AuthPayload> => {
  const response = await api.post('/auth/login', { username, password });
  setAuthToken(response.data.token);
  return response.data;
};

export const register = async (username: string, email: string, password: string): Promise<AuthPayload> => {
  const response = await api.post('/auth/register', { username, email, password });
  setAuthToken(response.data.token);
  return response.data;
};

export const getFeed = async (page: number = 0, size: number = 10): Promise<VideoItem[]> => {
  const response = await api.get('/feed', { params: { page, size } });
  return response.data;
};

export const recordView = async (videoId: string, watchDuration: number = 0, completed: boolean = false) => {
  const response = await api.post(`/feed/view/${videoId}`, null, {
    params: { watchDuration, completed },
  });
  return response.data;
};

export const getVideos = async () => {
  const response = await api.get('/videos');
  return response.data;
};

export const getVideoDetail = async (videoId: string, repostedByUserId?: string): Promise<VideoItem> => {
  const response = await api.get(`/videos/${videoId}`, {
    params: repostedByUserId ? { repostedByUserId } : undefined,
  });
  return response.data;
};

export const uploadVideo = async (
  file: { uri: string; name: string; type: string },
  title: string,
  description: string,
  onProgress?: (progress: number) => void
) => {
  const uploadTask = LegacyFileSystem.createUploadTask(
    `${API_BASE_URL}/videos/upload`,
    file.uri,
    {
      fieldName: 'file',
      uploadType: LegacyFileSystem.FileSystemUploadType.MULTIPART,
      mimeType: file.type || 'video/mp4',
      parameters: {
        title,
        description,
      },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      httpMethod: 'POST',
    },
    (progressData) => {
      if (onProgress && progressData.totalBytesExpectedToSend > 0) {
        const progress = Math.round(
          (progressData.totalBytesSent * 100) / progressData.totalBytesExpectedToSend
        );
        onProgress(progress);
      }
    }
  ); 

  const result = await uploadTask.uploadAsync();
  if (!result) {
    throw new Error('Upload cancelled');
  }

  let parsedBody: any = null;
  try {
    parsedBody = result.body ? JSON.parse(result.body) : null;
  } catch {
    parsedBody = result.body;
  }

  if (result.status < 200 || result.status >= 300) {
    const message =
      parsedBody?.message ||
      parsedBody?.error ||
      `Upload failed with status ${result.status}`;
    const error = new Error(message) as Error & {
      response?: { data: any; status: number };
    };
    error.response = { data: parsedBody, status: result.status };
    throw error;
  }

  return parsedBody;
};

export const toggleLike = async (videoId: string) => {
  const response = await api.post(`/social/like/${videoId}`);
  return response.data;
};

export const getLikeStatus = async (videoId: string) => {
  const response = await api.get(`/social/like/${videoId}/status`);
  return response.data;
};

export const addComment = async (videoId: string, content: string, parentId?: string) => {
  const response = await api.post('/social/comment', {
    videoId,
    content,
    parentId,
  });
  return response.data;
};

export const getComments = async (videoId: string, nested: boolean = true): Promise<CommentItem[]> => {
  const response = await api.get(`/social/comments/${videoId}`, { params: { nested } });
  return response.data;
};

export const deleteComment = async (commentId: string) => {
  const response = await api.delete(`/social/comment/${commentId}`);
  return response.data;
};

export const toggleFollow = async (targetUserId: string) => {
  const response = await api.post(`/social/follow/${targetUserId}`);
  return response.data;
};

export const getFollowStatus = async (targetUserId: string) => {
  const response = await api.get(`/social/follow/${targetUserId}/status`);
  return response.data;
};

export const shareVideo = async (videoId: string) => {
  const response = await api.post(`/social/share/${videoId}`);
  return response.data;
};

export const createRepost = async (videoId: string) => {
  const response = await api.post(`/social/reposts/${videoId}`);
  return response.data;
};

export const removeRepost = async (videoId: string) => {
  const response = await api.delete(`/social/reposts/${videoId}`);
  return response.data;
};

export const reportVideo = async (videoId: string, reason: string) => {
  const response = await api.post('/report', { videoId, reason });
  return response.data;
};

export const getMyProfile = async (): Promise<ProfileData> => {
  const response = await api.get('/profile');
  return response.data;
};

export const updateMyProfile = async (payload: {
  username?: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<ProfileData> => {
  const response = await api.put('/profile', payload);
  return response.data;
};

export const getUserProfile = async (userId: string): Promise<ProfileData> => {
  const response = await api.get(`/users/${userId}/profile`);
  return response.data;
};

export const getMyVideos = async (): Promise<VideoItem[]> => {
  const response = await api.get('/profile/videos');
  return response.data;
};

export const getUserVideos = async (userId: string): Promise<VideoItem[]> => {
  const response = await api.get(`/users/${userId}/videos`);
  return response.data;
};

export const getFollowers = async (userId: string): Promise<UserCard[]> => {
  const response = await api.get(`/users/${userId}/followers`);
  return response.data;
};

export const getFollowing = async (userId: string): Promise<UserCard[]> => {
  const response = await api.get(`/users/${userId}/following`);
  return response.data;
};

export const getCreatorDashboard = async (): Promise<DashboardData> => {
  const response = await api.get('/dashboard');
  return response.data;
};

export const getDiscover = async (): Promise<DiscoverData> => {
  const response = await api.get('/discover');
  return response.data;
};

export const searchDiscover = async (query: string, page: number = 0, size: number = 12): Promise<SearchResults> => {
  const response = await api.get('/discover/search', {
    params: { q: query, page, size },
  });
  return response.data;
};

export const getHashtagDetail = async (tag: string, page: number = 0, size: number = 12): Promise<HashtagDetail> => {
  const response = await api.get(`/discover/hashtags/${encodeURIComponent(tag)}`, {
    params: { page, size },
  });
  return response.data;
};

export const getNotifications = async (page: number = 0, size: number = 20): Promise<NotificationItem[]> => {
  const response = await api.get('/notifications', {
    params: { page, size },
  });
  return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get('/notifications/unread-count');
  return response.data.count || 0;
};

export const markNotificationRead = async (notificationId: string) => {
  const response = await api.post(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};

export const getModerationQueue = async (status?: string, page: number = 0, size: number = 20) => {
  const response = await api.get('/moderation/queue', { params: { status, page, size } });
  return response.data;
};

export const getModerationItem = async (queueId: string) => {
  const response = await api.get(`/moderation/queue/${queueId}`);
  return response.data;
};

export const getVideoScenes = async (queueId: string) => {
  const response = await api.get(`/moderation/queue/${queueId}/scenes`);
  return response.data;
};

export const assignModerationItem = async (queueId: string) => {
  const response = await api.post(`/moderation/queue/${queueId}/assign`);
  return response.data;
};

export const markReviewed = async (queueId: string, notes?: string) => {
  const response = await api.post(`/moderation/queue/${queueId}/review`, { reason: notes });
  return response.data;
};

export const approveVideo = async (queueId: string, notes?: string) => {
  const response = await api.post(`/moderation/queue/${queueId}/approve`, { reason: notes });
  return response.data;
};

export const rejectVideo = async (queueId: string, reason?: string) => {
  const response = await api.post(`/moderation/queue/${queueId}/reject`, { reason });
  return response.data;
};

export const addSceneTag = async (sceneId: string, tagId: string) => {
  const response = await api.post(`/moderation/scenes/${sceneId}/tags`, { tagId });
  return response.data;
};

export const removeSceneTag = async (sceneId: string, tagId: string) => {
  const response = await api.delete(`/moderation/scenes/${sceneId}/tags/${tagId}`);
  return response.data;
};

export const getModerationTags = async () => {
  const response = await api.get('/moderation/tags');
  return response.data;
};

export default api;

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/Config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// ==================== AUTH ====================
export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  setAuthToken(response.data.token);
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

// ==================== FEED ====================
export const getFeed = async (page: number = 0, size: number = 10) => {
  const response = await api.get('/feed', { params: { page, size } });
  return response.data;
};

export const recordView = async (videoId: string, watchDuration: number = 0, completed: boolean = false) => {
  const response = await api.post(`/feed/view/${videoId}`, null, {
    params: { watchDuration, completed }
  });
  return response.data;
};

// ==================== VIDEOS ====================
export const getVideos = async () => {
  const response = await api.get('/videos');
  return response.data;
};

export const uploadVideo = async (
  file: { uri: string; name: string; type: string },
  title: string,
  description: string,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  // @ts-ignore
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'video/mp4',
  });
  formData.append('title', title);
  formData.append('description', description);

  const response = await api.post('/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 minutes for upload
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
  return response.data;
};

// ==================== SOCIAL ====================
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

export const getComments = async (videoId: string, nested: boolean = true) => {
  const response = await api.get(`/social/comments/${videoId}`, {
    params: { nested }
  });
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

// ==================== REPORT ====================
export const reportVideo = async (videoId: string, reason: string) => {
  const response = await api.post('/report', { videoId, reason });
  return response.data;
};

// ==================== PROFILE & DASHBOARD ====================
export const getMyProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

export const getUserProfile = async (userId: string) => {
  const response = await api.get(`/users/${userId}/profile`);
  return response.data;
};

export const getCreatorDashboard = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;

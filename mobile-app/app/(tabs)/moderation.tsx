/**
 * Màn hình kiểm duyệt video (Moderation Tab) — Mobile App.
 *
 * Vai trò: Cổng vào duy nhất cho Moderator/Admin để xem hàng chờ kiểm duyệt,
 * lọc theo trạng thái, và mở chi tiết video để ra quyết định.
 *
 * Cấu trúc 2 view luân phiên:
 *   1. Danh sách hàng chờ (mặc định) — FlatList các card video.
 *   2. Chi tiết video (khi selectedItem ≠ null) — render ModerationVideoDetail.
 *
 * Quyền: Chỉ hiển thị nội dung khi user.role là 'admin' hoặc 'moderator'.
 * Người dùng thường thấy màn hình "Access Denied" với biểu tượng Shield.
 *
 * @author Hoàng Sơn Lâm (B22DCCN477)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';
import ModerationVideoDetail from '@/components/ModerationVideoDetail';
import { Shield, AlertTriangle, Clock, CheckCircle2, Flag, Eye, Film } from 'lucide-react-native';

/** Ba tab trạng thái — khớp với enum trên backend (ModerationQueue.status). */
const STATUS_FILTERS = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'in_review', label: 'In Review', icon: Eye },
  { key: 'reviewed', label: 'Reviewed', icon: CheckCircle2 },
];

/**
 * Cấu trúc một bản ghi hàng chờ trả về từ API.
 * Khớp với DTO ModerationQueueResponse.java ở backend.
 */
interface QueueItem {
  queueId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  uploaderUsername: string;
  uploaderId: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  aiJobStatus: string | null;
  sceneCount: number;
  reportCount: number;
  videoStatus: string;
  createdAt: string;
}

/** Bộ đếm số lượng bản ghi theo từng trạng thái (cho badge tab). */
interface QueueStats {
  pending: number;
  in_review: number;
  reviewed: number;
}

/** Chiều cao thanh tab dưới cùng — dùng để chừa padding cho FlatList. */
const TAB_BAR_HEIGHT = 60;

/**
 * Component chính của màn hình Moderation.
 *
 * State quản lý:
 * - items: danh sách card video trong hàng chờ.
 * - stats: bộ đếm cho 3 tab.
 * - activeFilter: tab đang chọn ('pending' | 'in_review' | 'reviewed').
 * - selectedItem: khi user bấm vào card, sẽ điều hướng sang màn chi tiết.
 */
export default function ModerationScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, in_review: 0, reviewed: 0 });
  const [activeFilter, setActiveFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  // Kiểm tra quyền truy cập — vai trò 'admin' hoặc 'moderator' mới được vào.
  const isModerator = user?.role === 'admin' || user?.role === 'moderator';

  /** Lấy số lượng bản ghi cho 3 tab (GET /api/moderation/stats). */
  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getModerationStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  /**
   * Lấy danh sách hàng chờ theo tab đang active.
   * Sẽ chạy lại tự động khi activeFilter thay đổi (qua useEffect).
   */
  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.getModerationQueue(activeFilter);
      setItems(data.content || []);
    } catch (error) {
      console.error('Failed to fetch moderation queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    if (isModerator) {
      setLoading(true);
      fetchQueue();
      fetchStats();
    }
  }, [activeFilter, isModerator, fetchQueue, fetchStats]);

  /** Pull-to-refresh: tải lại cả queue lẫn stats. */
  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
    fetchStats();
  };

  /**
   * Xử lý khi quay lại từ màn chi tiết.
   * Sau khi moderator approve/reject/sửa tag, cần refresh lại danh sách
   * để phản ánh trạng thái mới (vd: video vừa approve sẽ biến mất khỏi tab "pending").
   */
  const handleBackFromDetail = () => {
    setSelectedItem(null);
    fetchQueue();
    fetchStats();
  };

  if (!isModerator) {
    return (
      <View className="flex-1 bg-surface items-center justify-center p-6">
        <Shield size={64} color="#e80048" className="mb-6 opacity-80" />
        <Text className="text-3xl font-display font-bold text-primary mb-2">Access Denied</Text>
        <Text className="text-base font-body text-gray-400 text-center">
          Only authorized personnel can access the neon moderation terminal.
        </Text>
      </View>
    );
  }

  if (selectedItem) {
    return (
      <ModerationVideoDetail
        item={selectedItem}
        onBack={handleBackFromDetail}
      />
    );
  }

  /**
   * Trả về bộ màu cho badge ưu tiên (background, text, border).
   * Bốn mức từ thấp đến cao: default → normal → high → urgent.
   */
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return { bg: '#e80048', text: '#fff', border: '#ff3370' };
      case 'high': return { bg: '#d97706', text: '#fff', border: '#f59e0b' };
      case 'normal': return { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: '#7c3aed' };
      default: return { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: '#6b7280' };
    }
  };

  /** Chuyển ISO datetime string thành "Xm ago" / "Xh ago" / "Xd ago". */
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const renderItem = ({ item }: { item: QueueItem }) => {
    const priority = getPriorityStyle(item.priority);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedItem(item)}
        activeOpacity={0.7}
      >
        {/* Thumbnail + Info row */}
        <View style={styles.cardRow}>
          {item.videoThumbnail ? (
            <Image source={{ uri: item.videoThumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Film size={20} color="#555" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.videoTitle || 'Untitled'}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priority.bg, borderColor: priority.border }]}>
                <Text style={[styles.priorityText, { color: priority.text }]}>{item.priority}</Text>
              </View>
            </View>
            <Text style={styles.uploaderText}>@{item.uploaderUsername}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Film size={11} color="#9ca3af" />
                <Text style={styles.metaText}>{item.sceneCount} scenes</Text>
              </View>
              {item.reportCount > 0 && (
                <View style={[styles.metaChip, styles.reportChip]}>
                  <Flag size={11} color="#e80048" />
                  <Text style={[styles.metaText, { color: '#ff8c95' }]}>{item.reportCount} reports</Text>
                </View>
              )}
              {item.assignedTo && (
                <View style={[styles.metaChip, styles.assignedChip]}>
                  <Text style={styles.assignedText}>{item.assignedTo}</Text>
                </View>
              )}
              <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalItems = stats.pending + stats.in_review + stats.reviewed;

  return (
    <View className="flex-1 bg-surface pt-16 px-4">
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text className="text-3xl font-display font-bold text-white tracking-widest">MODERATION</Text>
          <Text style={styles.headerSub}>{totalItems} items in queue</Text>
        </View>
        <Shield size={32} color="#ff8c95" />
      </View>

      {/* Filter tabs with counts */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          const count = stats[filter.key as keyof QueueStats] || 0;
          const Icon = filter.icon;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <View style={styles.filterContent}>
                <Icon size={13} color={isActive ? '#e80048' : '#6b7280'} />
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isActive && styles.countTextActive]}>{count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Queue list */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ff8c95" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.queueId}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8c95" />}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <CheckCircle2 size={48} color="#29fcf3" className="opacity-40 mb-4" />
              <Text className="text-gray-400 font-label text-center">Queue is clear. No items to review.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerSub: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1c1320',
    padding: 4,
    borderRadius: 999,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 999,
  },
  filterButtonActive: {
    backgroundColor: '#2a1b32',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterLabelActive: {
    color: '#e80048',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(107,114,128,0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(232,0,72,0.2)',
  },
  countText: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '700',
  },
  countTextActive: {
    color: '#ff8c95',
  },
  card: {
    backgroundColor: '#1a1220',
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#2a1b32',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  uploaderText: {
    color: '#a78bfa',
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '500',
  },
  reportChip: {
    backgroundColor: 'rgba(232,0,72,0.1)',
  },
  assignedChip: {
    backgroundColor: 'rgba(41,252,243,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(41,252,243,0.2)',
  },
  assignedText: {
    color: '#29fcf3',
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    color: '#4b5563',
    fontSize: 10,
    marginLeft: 'auto',
  },
});

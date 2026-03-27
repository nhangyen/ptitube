import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';
import ModerationVideoDetail from '@/components/ModerationVideoDetail';

const STATUS_FILTERS = ['pending', 'in_review', 'approved', 'rejected'];

interface QueueItem {
  queueId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  uploaderUsername: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  aiJobStatus: string | null;
  sceneCount: number;
  createdAt: string;
}

export default function ModerationScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  const isModerator = user?.role === 'admin' || user?.role === 'moderator';

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
    }
  }, [activeFilter, isModerator, fetchQueue]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const handleApprove = async (queueId: string) => {
    Alert.prompt('Approve Video', 'Reason (optional):', async (reason) => {
      try {
        await api.approveVideo(queueId, reason || undefined);
        fetchQueue();
        setSelectedItem(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to approve video');
      }
    });
  };

  const handleReject = async (queueId: string) => {
    Alert.prompt('Reject Video', 'Reason:', async (reason) => {
      if (!reason) {
        Alert.alert('Error', 'Reason is required for rejection');
        return;
      }
      try {
        await api.rejectVideo(queueId, reason);
        fetchQueue();
        setSelectedItem(null);
      } catch (error) {
        Alert.alert('Error', 'Failed to reject video');
      }
    });
  };

  if (!isModerator) {
    return (
      <View style={styles.center}>
        <Text style={styles.accessDenied}>Access Denied</Text>
        <Text style={styles.subtitle}>Only moderators and admins can access this screen.</Text>
      </View>
    );
  }

  if (selectedItem) {
    return (
      <ModerationVideoDetail
        item={selectedItem}
        onBack={() => setSelectedItem(null)}
        onApprove={() => handleApprove(selectedItem.queueId)}
        onReject={() => handleReject(selectedItem.queueId)}
      />
    );
  }

  const renderItem = ({ item }: { item: QueueItem }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.videoTitle} numberOfLines={1}>{item.videoTitle}</Text>
        <View style={[styles.priorityBadge, priorityColor(item.priority)]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      <Text style={styles.uploader}>by @{item.uploaderUsername}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>{item.sceneCount} scenes</Text>
        <Text style={styles.meta}>AI: {item.aiJobStatus || 'N/A'}</Text>
        {item.assignedTo && <Text style={styles.meta}>Assigned: {item.assignedTo}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Moderation Queue</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, activeFilter === status && styles.filterTabActive]}
            onPress={() => setActiveFilter(status)}>
            <Text style={[styles.filterText, activeFilter === status && styles.filterTextActive]}>
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.queueId}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          ListEmptyComponent={
            <Text style={styles.empty}>No items in queue</Text>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return { backgroundColor: '#e74c3c' };
    case 'high': return { backgroundColor: '#e67e22' };
    case 'normal': return { backgroundColor: '#3498db' };
    default: return { backgroundColor: '#95a5a6' };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 60, paddingHorizontal: 16 },
  center: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  header: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  accessDenied: { color: '#e74c3c', fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 14, marginTop: 8 },
  filterRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#222' },
  filterTabActive: { backgroundColor: '#3498db' },
  filterText: { color: '#888', fontSize: 12, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  videoTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  uploader: { color: '#888', fontSize: 13, marginTop: 4 },
  cardFooter: { flexDirection: 'row', marginTop: 10, gap: 12 },
  meta: { color: '#666', fontSize: 12 },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
});

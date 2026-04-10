import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/services/api';
import ModerationVideoDetail from '@/components/ModerationVideoDetail';
import { Shield, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react-native';

const STATUS_FILTERS = ['pending', 'in_review', 'reviewed'];

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

  const handleMarkReviewed = async (queueId: string) => {
    try {
      await api.markReviewed(queueId);
      fetchQueue();
      setSelectedItem(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as reviewed');
    }
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
        onBack={() => setSelectedItem(null)}
        onMarkReviewed={() => handleMarkReviewed(selectedItem.queueId)}
      />
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-primary-dim text-on-primary';
      case 'high': return 'bg-[#d97706] text-white';
      case 'normal': return 'bg-secondary/20 text-secondary';
      default: return 'bg-surface-container-highest text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} color="#ff8c95" />;
      case 'in_review': return <AlertTriangle size={14} color="#f3ffca" />;
      case 'reviewed': return <CheckCircle2 size={14} color="#29fcf3" />;
      default: return null;
    }
  };

  const renderItem = ({ item }: { item: QueueItem }) => (
    <TouchableOpacity 
      className="bg-surface-container-low mb-4 rounded-3xl p-5 overflow-hidden" 
      onPress={() => setSelectedItem(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg font-headline font-semibold text-white flex-1 mr-3" numberOfLines={1}>
          {item.videoTitle || 'Untitled Sequence'}
        </Text>
        <View className={`px-3 py-1 rounded-full ${getPriorityColor(item.priority.toLowerCase())}`}>
          <Text className="text-[10px] font-label font-bold uppercase tracking-wider">
            {item.priority}
          </Text>
        </View>
      </View>
      
      <Text className="text-sm font-body text-gray-400 mb-4">
        by <Text className="text-secondary">@{item.uploaderUsername}</Text>
      </Text>
      
      <View className="flex-row items-center flex-wrap gap-y-2">
        <View className="bg-surface-container-high px-3 py-1.5 rounded-xl mr-2">
          <Text className="text-xs font-label text-gray-300">{item.sceneCount} scenes</Text>
        </View>
        <View className="bg-surface-container-highest px-3 py-1.5 rounded-xl mr-2 flex-row items-center">
          <View style={styles.statusIcon}>{getStatusIcon(activeFilter)}</View>
          <Text className="text-xs font-label text-gray-300">AI: {item.aiJobStatus || 'N/A'}</Text>
        </View>
        {item.assignedTo && (
          <View className="bg-surface-container-high px-3 py-1.5 rounded-xl flex-row items-center border border-outline-variant/30">
            <Text className="text-xs font-label text-primary-fixed-dim">Assigned</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-surface pt-16 px-4">
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-3xl font-display font-bold text-white tracking-widest">MODERATION</Text>
          <Text className="text-sm font-label text-secondary mt-1 tracking-widest uppercase">System Terminal</Text>
        </View>
        <Shield size={32} color="#ff8c95" />
      </View>

      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              activeFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(status)}>
            <Text
              style={[
                styles.filterLabel,
                activeFilter === status && styles.filterLabelActive,
              ]}
            >
              {status.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
              <Text className="text-gray-400 font-label text-center">Queue is clear.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#1c1320',
    padding: 4,
    borderRadius: 999,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
  },
  filterButtonActive: {
    backgroundColor: '#2a1b32',
  },
  filterLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterLabelActive: {
    color: '#e80048',
    fontWeight: '700',
  },
  statusIcon: {
    marginRight: 4,
  },
});

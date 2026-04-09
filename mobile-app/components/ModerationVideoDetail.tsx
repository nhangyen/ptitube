import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { API_BASE_URL } from '@/constants/Config';
import * as api from '@/services/api';
import SceneTagEditor from './SceneTagEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QueueItem {
  queueId: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  uploaderUsername: string;
  priority: string;
  status: string;
  aiJobStatus: string | null;
  sceneCount: number;
}

interface TagData {
  id: string;
  name: string;
  category: string;
  source: string;
  confidence: number | null;
}

interface SceneData {
  sceneId: string;
  sceneIndex: number;
  startTime: number;
  endTime: number;
  thumbnailUrl: string | null;
  aiSummary: string | null;
  status: string;
  tags: TagData[];
}

interface Props {
  item: QueueItem;
  onBack: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export default function ModerationVideoDetail({ item, onBack, onApprove, onReject }: Props) {
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<SceneData | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const videoRef = useRef<Video>(null);

  const resolveVideoUri = () => {
    if (item.videoUrl?.startsWith('http')) {
      return item.videoUrl;
    }
    return `${API_BASE_URL.replace('/api', '')}${item.videoUrl}`;
  };

  const fetchScenes = async () => {
    try {
      const data = await api.getVideoScenes(item.queueId);
      setScenes(data);
      if (data.length > 0 && !selectedScene) {
        setSelectedScene(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenes();
  }, [item.queueId]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      onApprove();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    onReject(rejectReason.trim());
    setShowRejectModal(false);
    setRejectReason('');
    setActionLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.videoTitle}</Text>
        <View style={[styles.statusBadge, statusColor(item.status)]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Video Player */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: resolveVideoUri() }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
            shouldPlay={false}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Uploader: <Text style={styles.infoValue}>@{item.uploaderUsername}</Text></Text>
          <Text style={styles.infoLabel}>Priority: <Text style={styles.infoValue}>{item.priority}</Text></Text>
          <Text style={styles.infoLabel}>AI Status: <Text style={styles.infoValue}>{item.aiJobStatus || 'N/A'}</Text></Text>
          <Text style={styles.infoLabel}>Scenes: <Text style={styles.infoValue}>{scenes.length}</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>Scenes</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginTop: 20 }} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneTimeline}>
              {scenes.map((scene) => (
                <TouchableOpacity
                  key={scene.sceneId}
                  style={[styles.sceneThumb, selectedScene?.sceneId === scene.sceneId && styles.sceneThumbActive]}
                  onPress={() => {
                    setSelectedScene(scene);
                    if (videoRef.current) {
                      videoRef.current.setPositionAsync(scene.startTime * 1000);
                    }
                  }}>
                  <Text style={styles.sceneIndex}>#{scene.sceneIndex + 1}</Text>
                  <Text style={styles.sceneTime}>
                    {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                  </Text>
                  <Text style={styles.sceneTagCount}>{scene.tags.length} tags</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedScene && (
              <SceneTagEditor
                scene={selectedScene}
                onTagsChanged={fetchScenes}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* Action Bar */}
      {item.status !== 'reviewed' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setShowRejectModal(true)}
            disabled={actionLoading}>
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={handleApprove}
            disabled={actionLoading}>
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Video</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for rejection..."
              placeholderTextColor="#666"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowRejectModal(false); setRejectReason(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, !rejectReason.trim() && styles.modalConfirmDisabled]}
                onPress={handleReject}
                disabled={!rejectReason.trim()}>
                <Text style={styles.actionText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const statusColor = (status: string) => {
  switch (status) {
    case 'pending': return { backgroundColor: '#e67e22' };
    case 'in_review': return { backgroundColor: '#3498db' };
    case 'reviewed': return { backgroundColor: '#27ae60' };
    default: return { backgroundColor: '#95a5a6' };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backButton: { color: '#3498db', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  content: { flex: 1, paddingHorizontal: 16 },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  videoPlayer: { width: '100%', height: '100%' },
  infoCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  infoValue: { color: '#fff' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  sceneTimeline: { marginBottom: 16 },
  sceneThumb: { backgroundColor: '#222', borderRadius: 8, padding: 12, marginRight: 10, width: 120, alignItems: 'center' },
  sceneThumbActive: { borderColor: '#3498db', borderWidth: 2 },
  sceneIndex: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sceneTime: { color: '#888', fontSize: 11, marginTop: 4 },
  sceneTagCount: { color: '#666', fontSize: 10, marginTop: 2 },
  actionBar: { flexDirection: 'row', padding: 16, gap: 10, paddingBottom: 40 },
  rejectButton: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 14, alignItems: 'center' },
  approveButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 16 },
  reasonInput: { backgroundColor: '#222', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, backgroundColor: '#333', borderRadius: 8, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  modalConfirm: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 14, alignItems: 'center' },
  modalConfirmDisabled: { opacity: 0.5 },
});

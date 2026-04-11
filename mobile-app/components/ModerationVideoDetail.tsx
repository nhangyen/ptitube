import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/services/api';
import SceneTagEditor from './SceneTagEditor';
import { ArrowLeft, User, Gauge, Bot, Film, Flag, CheckCircle2, XCircle, Shield, AlertTriangle } from 'lucide-react-native';

const TAB_BAR_HEIGHT = 60;

interface QueueItem {
  queueId: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  uploaderUsername: string;
  priority: string;
  status: string;
  aiJobStatus: string | null;
  sceneCount: number;
  reportCount: number;
  videoStatus: string;
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
}

export default function ModerationVideoDetail({ item, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<SceneData | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(item.status);
  const [reports, setReports] = useState<{ id: string; reason: string; reporterUsername: string; createdAt: string }[]>([]);
  const selectedSceneIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedSceneIdRef.current = selectedScene?.sceneId ?? null;
  }, [selectedScene?.sceneId]);

  const fetchScenes = useCallback(async (preferredSceneId?: string) => {
    try {
      const data: SceneData[] = await api.getVideoScenes(item.queueId);
      setScenes(data);
      if (data.length === 0) {
        setSelectedScene(null);
        return;
      }

      const targetSceneId = preferredSceneId ?? selectedSceneIdRef.current;
      const nextSelectedScene = targetSceneId
        ? data.find((scene) => scene.sceneId === targetSceneId) || data[0]
        : data[0];
      setSelectedScene(nextSelectedScene);
    } catch (error) {
      console.error('Failed to fetch scenes:', error);
    } finally {
      setLoading(false);
    }
  }, [item.queueId]);

  useEffect(() => {
    setLoading(true);
    void fetchScenes();
    if (item.reportCount > 0) {
      api.getVideoReports(item.queueId).then(setReports).catch(console.error);
    }
  }, [fetchScenes, item.queueId, item.reportCount]);

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await api.assignModerationItem(item.queueId);
      setCurrentStatus('in_review');
    } catch (error) {
      Alert.alert('Error', 'Failed to assign item');
    } finally {
      setAssigning(false);
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Video',
      'This will make the video visible to all users. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading('approve');
            try {
              await api.approveVideo(item.queueId, reviewNotes || undefined);
              Alert.alert('Done', 'Video approved successfully', [{ text: 'OK', onPress: onBack }]);
            } catch (error) {
              Alert.alert('Error', 'Failed to approve video');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason before rejecting.');
      setShowNotes(true);
      return;
    }
    Alert.alert(
      'Reject Video',
      'This will ban the video and resolve all related reports. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('reject');
            try {
              await api.rejectVideo(item.queueId, reviewNotes);
              Alert.alert('Done', 'Video rejected and banned', [{ text: 'OK', onPress: onBack }]);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject video');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return { color: '#e80048', bg: 'rgba(232,0,72,0.15)' };
      case 'high': return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
      case 'normal': return { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' };
      default: return { color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' };
    }
  };

  const isActionable = currentStatus === 'pending' || currentStatus === 'in_review';
  const flaggedScenes = scenes.filter(s => s.tags.some(t => t.source === 'ai' && (t.confidence ?? 0) >= 0.8));
  const priorityStyle = getPriorityStyle(item.priority);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ff8c95" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.videoTitle || 'Untitled'}</Text>
        {currentStatus === 'reviewed' && (
          <View style={styles.reviewedBadge}>
            <CheckCircle2 size={12} color="#29fcf3" />
            <Text style={styles.reviewedText}>Reviewed</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video preview */}
        {item.videoThumbnail && (
          <Image source={{ uri: item.videoThumbnail }} style={styles.videoPreview} resizeMode="cover" />
        )}

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <User size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Uploader</Text>
            <Text style={styles.infoValue}>@{item.uploaderUsername}</Text>
          </View>
          <View style={styles.infoItem}>
            <Gauge size={14} color={priorityStyle.color} />
            <Text style={styles.infoLabel}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.color }]}>{item.priority}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Bot size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>AI Status</Text>
            <Text style={styles.infoValue}>{item.aiJobStatus || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Film size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Scenes</Text>
            <Text style={styles.infoValue}>{scenes.length}</Text>
          </View>
        </View>

        {/* Report warning */}
        {item.reportCount > 0 && (
          <View style={styles.reportWarning}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Flag size={16} color="#e80048" />
              <View style={{ flex: 1 }}>
                <Text style={styles.reportWarningTitle}>{item.reportCount} user report{item.reportCount > 1 ? 's' : ''}</Text>
                <Text style={styles.reportWarningDesc}>This video has been flagged by the community</Text>
              </View>
            </View>
            {reports.length > 0 && (
              <View style={styles.reportList}>
                {reports.map((r) => (
                  <View key={r.id} style={styles.reportItem}>
                    <Text style={styles.reportUser}>@{r.reporterUsername}</Text>
                    <Text style={styles.reportReason}>{r.reason}</Text>
                    <Text style={styles.reportDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AI flagged scenes summary */}
        {flaggedScenes.length > 0 && (
          <View style={styles.aiWarning}>
            <AlertTriangle size={16} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiWarningTitle}>{flaggedScenes.length} scene{flaggedScenes.length > 1 ? 's' : ''} flagged by AI</Text>
              <Text style={styles.aiWarningDesc}>High-confidence violations detected</Text>
            </View>
          </View>
        )}

        {/* Assign button */}
        {currentStatus === 'pending' && (
          <TouchableOpacity style={styles.assignButton} onPress={handleAssign} disabled={assigning}>
            <Shield size={16} color="#fff" />
            <Text style={styles.assignText}>{assigning ? 'Assigning...' : 'Assign to me'}</Text>
          </TouchableOpacity>
        )}

        {/* Scenes section */}
        <Text style={styles.sectionTitle}>Scenes</Text>

        {loading ? (
          <ActivityIndicator size="small" color="#ff8c95" style={{ marginTop: 20 }} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneTimeline}>
              {scenes.map((scene) => {
                const isSelected = selectedScene?.sceneId === scene.sceneId;
                const hasAiFlags = scene.tags.some(t => t.source === 'ai' && (t.confidence ?? 0) >= 0.8);
                return (
                  <TouchableOpacity
                    key={scene.sceneId}
                    style={[
                      styles.sceneThumb,
                      isSelected && styles.sceneThumbActive,
                      hasAiFlags && !isSelected && styles.sceneThumbFlagged,
                    ]}
                    onPress={() => setSelectedScene(scene)}
                  >
                    {scene.thumbnailUrl ? (
                      <Image source={{ uri: scene.thumbnailUrl }} style={styles.sceneImage} />
                    ) : null}
                    <View style={styles.sceneInfo}>
                      <Text style={[styles.sceneIndex, isSelected && styles.sceneIndexActive]}>
                        #{scene.sceneIndex + 1}
                      </Text>
                      <Text style={styles.sceneTime}>
                        {formatTime(scene.startTime)}-{formatTime(scene.endTime)}
                      </Text>
                      <View style={styles.sceneTagRow}>
                        <Text style={[styles.sceneTagCount, hasAiFlags && { color: '#f59e0b' }]}>
                          {scene.tags.length} tags
                        </Text>
                        {hasAiFlags && <AlertTriangle size={10} color="#f59e0b" />}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Scene tag editor */}
            {selectedScene && (
              <SceneTagEditor
                scene={selectedScene}
                onTagsChanged={() => void fetchScenes(selectedScene.sceneId)}
              />
            )}
          </>
        )}

        {/* Review notes */}
        {isActionable && (
          <View style={styles.notesSection}>
            <TouchableOpacity style={styles.notesToggle} onPress={() => setShowNotes(!showNotes)}>
              <Text style={styles.notesToggleText}>{showNotes ? 'Hide notes' : 'Add review notes'}</Text>
            </TouchableOpacity>
            {showNotes && (
              <TextInput
                style={styles.notesInput}
                placeholder="Reason for your decision..."
                placeholderTextColor="#4b5563"
                value={reviewNotes}
                onChangeText={setReviewNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
          </View>
        )}

        {/* Spacer for action bar + tab bar */}
        <View style={{ height: isActionable ? 80 + bottomOffset : bottomOffset }} />
      </ScrollView>

      {/* Action bar */}
      {isActionable && (
        <View style={[styles.actionBar, { bottom: bottomOffset }]}>
          <TouchableOpacity
            style={[styles.rejectButton, actionLoading === 'reject' && styles.buttonDisabled]}
            onPress={handleReject}
            disabled={!!actionLoading}
          >
            {actionLoading === 'reject' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <XCircle size={18} color="#fff" />
                <Text style={styles.actionText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, actionLoading === 'approve' && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={!!actionLoading}
          >
            {actionLoading === 'approve' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <CheckCircle2 size={18} color="#fff" />
                <Text style={styles.actionText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: '#0a0a0f',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,140,149,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(41,252,243,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewedText: { color: '#29fcf3', fontSize: 11, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  videoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#1a1220',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#141018',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  infoLabel: { color: '#6b7280', fontSize: 11, fontWeight: '500' },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reportWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(232,0,72,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,0,72,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reportWarningTitle: { color: '#ff8c95', fontSize: 13, fontWeight: '700' },
  reportWarningDesc: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  reportList: { marginTop: 12, gap: 8 },
  reportItem: {
    backgroundColor: 'rgba(232,0,72,0.06)',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e80048',
  },
  reportUser: { color: '#ff8c95', fontSize: 11, fontWeight: '700' },
  reportReason: { color: '#d1d5db', fontSize: 12, marginTop: 4 },
  reportDate: { color: '#4b5563', fontSize: 10, marginTop: 4 },
  aiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  aiWarningTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  aiWarningDesc: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  assignText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sceneTimeline: { marginBottom: 16 },
  sceneThumb: {
    backgroundColor: '#141018',
    borderRadius: 12,
    marginRight: 10,
    width: 110,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sceneThumbActive: {
    borderColor: '#e80048',
  },
  sceneThumbFlagged: {
    borderColor: 'rgba(245,158,11,0.4)',
  },
  sceneImage: {
    width: '100%',
    height: 60,
    backgroundColor: '#1a1220',
  },
  sceneInfo: {
    padding: 8,
  },
  sceneIndex: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sceneIndexActive: { color: '#ff8c95' },
  sceneTime: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  sceneTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  sceneTagCount: { color: '#4b5563', fontSize: 10 },
  notesSection: {
    marginTop: 16,
  },
  notesToggle: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  notesToggleText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#141018',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#0a0a0f',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e80048',
    borderRadius: 14,
    padding: 16,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

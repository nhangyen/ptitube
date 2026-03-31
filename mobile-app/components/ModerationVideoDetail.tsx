import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as api from '@/services/api';
import SceneTagEditor from './SceneTagEditor';

interface QueueItem {
  queueId: string;
  videoId: string;
  videoTitle: string;
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
  onMarkReviewed: () => void;
}

export default function ModerationVideoDetail({ item, onBack, onMarkReviewed }: Props) {
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScene, setSelectedScene] = useState<SceneData | null>(null);
  const [assigning, setAssigning] = useState(false);

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

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await api.assignModerationItem(item.queueId);
    } catch (error) {
      console.error('Failed to assign:', error);
    } finally {
      setAssigning(false);
    }
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
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Uploader: <Text style={styles.infoValue}>@{item.uploaderUsername}</Text></Text>
          <Text style={styles.infoLabel}>Priority: <Text style={styles.infoValue}>{item.priority}</Text></Text>
          <Text style={styles.infoLabel}>AI Status: <Text style={styles.infoValue}>{item.aiJobStatus || 'N/A'}</Text></Text>
          <Text style={styles.infoLabel}>Scenes: <Text style={styles.infoValue}>{scenes.length}</Text></Text>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity style={styles.assignButton} onPress={handleAssign} disabled={assigning}>
            <Text style={styles.assignText}>{assigning ? 'Assigning...' : 'Assign to me'}</Text>
          </TouchableOpacity>
        )}

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
                  onPress={() => setSelectedScene(scene)}>
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

      {(item.status === 'pending' || item.status === 'in_review') && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.reviewedButton} onPress={onMarkReviewed}>
            <Text style={styles.actionText}>Mark Reviewed</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backButton: { color: '#3498db', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  infoCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoLabel: { color: '#888', fontSize: 13, marginBottom: 4 },
  infoValue: { color: '#fff' },
  assignButton: { backgroundColor: '#3498db', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  assignText: { color: '#fff', fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  sceneTimeline: { marginBottom: 16 },
  sceneThumb: { backgroundColor: '#222', borderRadius: 8, padding: 12, marginRight: 10, width: 120, alignItems: 'center' },
  sceneThumbActive: { borderColor: '#3498db', borderWidth: 2 },
  sceneIndex: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sceneTime: { color: '#888', fontSize: 11, marginTop: 4 },
  sceneTagCount: { color: '#666', fontSize: 10, marginTop: 2 },
  actionBar: { flexDirection: 'row', padding: 16, gap: 12, paddingBottom: 40 },
  reviewedButton: { flex: 1, backgroundColor: '#3498db', borderRadius: 8, padding: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

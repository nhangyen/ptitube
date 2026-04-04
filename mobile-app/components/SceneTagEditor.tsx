import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import * as api from '@/services/api';

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
  aiSummary: string | null;
  status: string;
  tags: TagData[];
}

interface AvailableTag {
  id: string;
  name: string;
  category: string;
}

interface Props {
  scene: SceneData;
  onTagsChanged: () => void;
}

export default function SceneTagEditor({ scene, onTagsChanged }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAvailableTags = async () => {
    try {
      const tags = await api.getModerationTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      fetchAvailableTags();
    }
  }, [showAddModal]);

  const handleAddTag = async (tagId: string) => {
    try {
      await api.addSceneTag(scene.sceneId, tagId);
      setShowAddModal(false);
      onTagsChanged();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await api.removeSceneTag(scene.sceneId, tagId);
      onTagsChanged();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !scene.tags.some((st) => st.id === tag.id)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scene #{scene.sceneIndex + 1} Tags</Text>
        <View style={[styles.statusBadge, statusColor(scene.status)]}>
          <Text style={styles.statusText}>{scene.status}</Text>
        </View>
      </View>

      {scene.aiSummary && (
        <Text style={styles.summary}>{scene.aiSummary}</Text>
      )}

      <View style={styles.tagList}>
        {scene.tags.map((tag) => (
          <View key={tag.id} style={styles.tagChip}>
            <View style={[styles.sourceDot, tag.source === 'ai' ? styles.aiDot : styles.manualDot]} />
            <Text style={styles.tagName}>{tag.name}</Text>
            {tag.confidence != null && (
              <Text style={styles.confidence}>{Math.round(tag.confidence * 100)}%</Text>
            )}
            <TouchableOpacity onPress={() => handleRemoveTag(tag.id)} style={styles.removeButton}>
              <Text style={styles.removeText}>x</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addTagButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addTagText}>+ Add Tag</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Tag</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search tags..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={filteredTags}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.tagOption} onPress={() => handleAddTag(item.id)}>
                  <Text style={styles.tagOptionName}>{item.name}</Text>
                  <Text style={styles.tagOptionCategory}>{item.category}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No tags found</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const statusColor = (status: string) => {
  switch (status) {
    case 'auto_tagged': return { backgroundColor: '#e67e22' };
    case 'reviewed': return { backgroundColor: '#3498db' };
    case 'revised': return { backgroundColor: '#2ecc71' };
    default: return { backgroundColor: '#95a5a6' };
  }
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  summary: { color: '#888', fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  aiDot: { backgroundColor: '#95a5a6' },
  manualDot: { backgroundColor: '#3498db' },
  tagName: { color: '#fff', fontSize: 12 },
  confidence: { color: '#888', fontSize: 10 },
  removeButton: { marginLeft: 4 },
  removeText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  addTagButton: { backgroundColor: '#222', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#444', borderStyle: 'dashed' },
  addTagText: { color: '#888', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  closeText: { color: '#3498db', fontSize: 16 },
  searchInput: { backgroundColor: '#333', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12 },
  tagOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  tagOptionName: { color: '#fff', fontSize: 15 },
  tagOptionCategory: { color: '#888', fontSize: 13 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
});

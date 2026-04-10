import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as api from '@/services/api';
import { Plus, X, Bot, Shield, Search } from 'lucide-react-native';

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
  const [loadingTag, setLoadingTag] = useState<string | null>(null);

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
    setLoadingTag(tagId);
    try {
      await api.addSceneTag(scene.sceneId, tagId);
      setShowAddModal(false);
      setSearchQuery('');
      onTagsChanged();
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setLoadingTag(null);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setLoadingTag(tagId);
    try {
      await api.removeSceneTag(scene.sceneId, tagId);
      onTagsChanged();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setLoadingTag(null);
    }
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !scene.tags.some((st) => st.id === tag.id)
  );

  const statusConfig = {
    auto_tagged: { label: 'Auto Tagged', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    reviewed: { label: 'Reviewed', color: '#29fcf3', bg: 'rgba(41,252,243,0.12)' },
    revised: { label: 'Revised', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  }[scene.status] || { label: scene.status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };

  // Group tags by source
  const aiTags = scene.tags.filter(t => t.source === 'ai');
  const adminTags = scene.tags.filter(t => t.source !== 'ai');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scene #{scene.sceneIndex + 1}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* AI Summary */}
      {scene.aiSummary && (
        <View style={styles.summaryBox}>
          <Bot size={13} color="#6b7280" />
          <Text style={styles.summary}>{scene.aiSummary}</Text>
        </View>
      )}

      {/* AI Tags */}
      {aiTags.length > 0 && (
        <View style={styles.tagGroup}>
          <View style={styles.tagGroupHeader}>
            <Bot size={12} color="#6b7280" />
            <Text style={styles.tagGroupLabel}>AI Detected</Text>
          </View>
          <View style={styles.tagList}>
            {aiTags.map((tag) => {
              const isHighConfidence = (tag.confidence ?? 0) >= 0.8;
              return (
                <View
                  key={tag.id}
                  style={[styles.tagChip, isHighConfidence ? styles.tagChipDanger : styles.tagChipAi]}
                >
                  <Text style={[styles.tagName, isHighConfidence && { color: '#fbbf24' }]}>{tag.name}</Text>
                  {tag.confidence != null && (
                    <Text style={[styles.confidence, isHighConfidence && { color: '#f59e0b' }]}>
                      {Math.round(tag.confidence * 100)}%
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => handleRemoveTag(tag.id)}
                    disabled={loadingTag === tag.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {loadingTag === tag.id ? (
                      <ActivityIndicator size={10} color="#6b7280" />
                    ) : (
                      <X size={12} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Admin Tags */}
      {adminTags.length > 0 && (
        <View style={styles.tagGroup}>
          <View style={styles.tagGroupHeader}>
            <Shield size={12} color="#a78bfa" />
            <Text style={[styles.tagGroupLabel, { color: '#a78bfa' }]}>Manual Tags</Text>
          </View>
          <View style={styles.tagList}>
            {adminTags.map((tag) => (
              <View key={tag.id} style={[styles.tagChip, styles.tagChipAdmin]}>
                <Text style={[styles.tagName, { color: '#c4b5fd' }]}>{tag.name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveTag(tag.id)}
                  disabled={loadingTag === tag.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {loadingTag === tag.id ? (
                    <ActivityIndicator size={10} color="#a78bfa" />
                  ) : (
                    <X size={12} color="#a78bfa" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* No tags */}
      {scene.tags.length === 0 && (
        <Text style={styles.noTags}>No tags assigned to this scene</Text>
      )}

      {/* Add tag button */}
      <TouchableOpacity style={styles.addTagButton} onPress={() => setShowAddModal(true)}>
        <Plus size={14} color="#a78bfa" />
        <Text style={styles.addTagText}>Add Tag</Text>
      </TouchableOpacity>

      {/* Add tag modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Tag</Text>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); setSearchQuery(''); }}
                style={styles.modalClose}
              >
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={16} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tags..."
                placeholderTextColor="#4b5563"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {/* Tag list */}
            <FlatList
              data={filteredTags}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tagOption}
                  onPress={() => handleAddTag(item.id)}
                  disabled={loadingTag === item.id}
                >
                  <View>
                    <Text style={styles.tagOptionName}>{item.name}</Text>
                    <Text style={styles.tagOptionCategory}>{item.category}</Text>
                  </View>
                  {loadingTag === item.id ? (
                    <ActivityIndicator size="small" color="#a78bfa" />
                  ) : (
                    <Plus size={18} color="#4b5563" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No matching tags' : 'All tags already assigned'}
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141018',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  summary: { color: '#9ca3af', fontSize: 12, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  tagGroup: {
    marginBottom: 12,
  },
  tagGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tagGroupLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  tagChipAi: {
    backgroundColor: 'rgba(156,163,175,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.15)',
  },
  tagChipDanger: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  tagChipAdmin: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  tagName: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  confidence: { color: '#6b7280', fontSize: 10, fontWeight: '500' },
  noTags: {
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
    borderStyle: 'dashed',
  },
  addTagText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141018',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(167,139,250,0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 12,
  },
  tagOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tagOptionName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  tagOptionCategory: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyText: { color: '#4b5563', textAlign: 'center', marginTop: 24, fontSize: 13 },
});

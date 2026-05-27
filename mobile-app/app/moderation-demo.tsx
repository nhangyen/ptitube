/**
 * Standalone moderation demo — mock data only, no API, no auth.
 * Dùng để chụp màn hình cho báo cáo.
 * Truy cập: /moderation-demo
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, Image, TextInput,
} from 'react-native';
import {
  Shield, Clock, Eye, CheckCircle2, Flag, Film,
  ArrowLeft, User, Gauge, Bot, AlertTriangle, XCircle,
  Plus, X,
} from 'lucide-react-native';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATS = { pending: 3, in_review: 1, reviewed: 5 };

const MOCK_QUEUE = [
  {
    queueId: 'q1', videoId: 'v1',
    videoTitle: 'Extreme stunts compilation 2024',
    videoThumbnail: 'https://picsum.photos/seed/stunts24/320/180',
    uploaderUsername: 'stuntkid99', uploaderId: 'u1',
    priority: 'high', status: 'pending',
    assignedTo: null, aiJobStatus: 'completed',
    sceneCount: 5, reportCount: 2, videoStatus: 'active',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    queueId: 'q2', videoId: 'v2',
    videoTitle: 'Cooking pasta aglio e olio',
    videoThumbnail: 'https://picsum.photos/seed/pasta42/320/180',
    uploaderUsername: 'chefmario', uploaderId: 'u2',
    priority: 'normal', status: 'pending',
    assignedTo: null, aiJobStatus: 'completed',
    sceneCount: 3, reportCount: 0, videoStatus: 'active',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    queueId: 'q3', videoId: 'v3',
    videoTitle: 'Night city timelapse downtown',
    videoThumbnail: 'https://picsum.photos/seed/citynight7/320/180',
    uploaderUsername: 'urbanphotog', uploaderId: 'u3',
    priority: 'normal', status: 'pending',
    assignedTo: null, aiJobStatus: 'completed',
    sceneCount: 4, reportCount: 0, videoStatus: 'active',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

const MOCK_DETAIL = MOCK_QUEUE[0];

const MOCK_SCENES = [
  {
    sceneId: 's1', sceneIndex: 0, startTime: 0, endTime: 12.4,
    thumbnailUrl: 'https://picsum.photos/seed/sc1x/220/124', aiSummary: 'Person performing dangerous jump from rooftop.',
    status: 'auto_tagged',
    tags: [
      { id: 't1', name: 'Dangerous Activity', category: 'safety', source: 'ai', confidence: 0.91 },
      { id: 't2', name: 'Outdoor', category: 'scene', source: 'ai', confidence: 0.76 },
    ],
  },
  {
    sceneId: 's2', sceneIndex: 1, startTime: 12.4, endTime: 28.1,
    thumbnailUrl: 'https://picsum.photos/seed/sc2x/220/124', aiSummary: 'Group of people watching extreme sports event.',
    status: 'auto_tagged',
    tags: [
      { id: 't3', name: 'Crowd', category: 'scene', source: 'ai', confidence: 0.82 },
      { id: 't4', name: 'Sports', category: 'activity', source: 'ai', confidence: 0.69 },
    ],
  },
  {
    sceneId: 's3', sceneIndex: 2, startTime: 28.1, endTime: 45.0,
    thumbnailUrl: 'https://picsum.photos/seed/sc3x/220/124', aiSummary: null,
    status: 'revised',
    tags: [
      { id: 't5', name: 'Urban', category: 'scene', source: 'ai', confidence: 0.55 },
      { id: 't6', name: 'Reviewed OK', category: 'moderation', source: 'admin', confidence: null },
    ],
  },
  {
    sceneId: 's4', sceneIndex: 3, startTime: 45.0, endTime: 60.0,
    thumbnailUrl: 'https://picsum.photos/seed/sc4x/220/124', aiSummary: null,
    status: 'auto_tagged',
    tags: [
      { id: 't7', name: 'Physical Violence', category: 'safety', source: 'ai', confidence: 0.87 },
    ],
  },
];

const MOCK_REPORTS = [
  {
    id: 'r1', reason: 'Nội dung nguy hiểm, có thể gây hại cho người xem trẻ em.',
    reporterUsername: 'user_parent22',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'r2', reason: 'Video khuyến khích hành vi nguy hiểm.',
    reporterUsername: 'safetymod',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const getPriorityStyle = (p: string) => {
  switch (p?.toLowerCase()) {
    case 'urgent': return { bg: '#e80048', text: '#fff', border: '#ff3370' };
    case 'high':   return { bg: '#d97706', text: '#fff', border: '#f59e0b' };
    case 'normal': return { bg: 'rgba(139,92,246,0.15)', text: '#a78bfa', border: '#7c3aed' };
    default:       return { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: '#6b7280' };
  }
};

// ─── Inline SceneTagEditor (no API) ──────────────────────────────────────────

function SceneTagEditorMock({ scene, selectedSceneId, onSelect }: {
  scene: typeof MOCK_SCENES[0];
  selectedSceneId: string;
  onSelect: (id: string) => void;
}) {
  const isSelected = scene.sceneId === selectedSceneId;
  const hasFlags = scene.tags.some(t => t.source === 'ai' && (t.confidence ?? 0) >= 0.8);

  return (
    <TouchableOpacity
      style={[styles.sceneThumb, isSelected && styles.sceneThumbActive, hasFlags && !isSelected && styles.sceneThumbFlagged]}
      onPress={() => onSelect(scene.sceneId)}
    >
      <View style={[styles.sceneImage, { backgroundColor: '#1a1220', alignItems: 'center', justifyContent: 'center' }]}>
        {scene.thumbnailUrl
          ? <Image source={{ uri: scene.thumbnailUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          : <Film size={18} color="#4b5563" />}
      </View>
      <View style={styles.sceneInfo}>
        <Text style={[styles.sceneIndex, isSelected && styles.sceneIndexActive]}>#{scene.sceneIndex + 1}</Text>
        <Text style={styles.sceneTime}>{formatTime(scene.startTime)}-{formatTime(scene.endTime)}</Text>
        <View style={styles.sceneTagRow}>
          <Text style={[styles.sceneTagCount, hasFlags && { color: '#f59e0b' }]}>{scene.tags.length} tags</Text>
          {hasFlags && <AlertTriangle size={10} color="#f59e0b" />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function TagPanel({ scene }: { scene: typeof MOCK_SCENES[0] }) {
  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    auto_tagged: { label: 'Auto Tagged', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    reviewed:    { label: 'Reviewed',    color: '#29fcf3', bg: 'rgba(41,252,243,0.12)' },
    revised:     { label: 'Revised',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  };
  const sc = statusConfig[scene.status] ?? { label: scene.status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  const aiTags = scene.tags.filter(t => t.source === 'ai');
  const adminTags = scene.tags.filter(t => t.source !== 'ai');

  return (
    <View style={tagStyles.container}>
      <View style={tagStyles.header}>
        <Text style={tagStyles.title}>Scene #{scene.sceneIndex + 1}</Text>
        <View style={[tagStyles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[tagStyles.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>
      {scene.aiSummary && (
        <View style={tagStyles.summaryBox}>
          <Bot size={13} color="#6b7280" />
          <Text style={tagStyles.summary}>{scene.aiSummary}</Text>
        </View>
      )}
      {aiTags.length > 0 && (
        <View style={tagStyles.tagGroup}>
          <View style={tagStyles.tagGroupHeader}>
            <Bot size={12} color="#6b7280" />
            <Text style={tagStyles.tagGroupLabel}>AI Detected</Text>
          </View>
          <View style={tagStyles.tagList}>
            {aiTags.map(tag => {
              const hi = (tag.confidence ?? 0) >= 0.8;
              return (
                <View key={tag.id} style={[tagStyles.tagChip, hi ? tagStyles.tagChipDanger : tagStyles.tagChipAi]}>
                  <Text style={[tagStyles.tagName, hi && { color: '#fbbf24' }]}>{tag.name}</Text>
                  {tag.confidence != null && (
                    <Text style={[tagStyles.confidence, hi && { color: '#f59e0b' }]}>{Math.round(tag.confidence * 100)}%</Text>
                  )}
                  <X size={12} color="#6b7280" />
                </View>
              );
            })}
          </View>
        </View>
      )}
      {adminTags.length > 0 && (
        <View style={tagStyles.tagGroup}>
          <View style={tagStyles.tagGroupHeader}>
            <Shield size={12} color="#a78bfa" />
            <Text style={[tagStyles.tagGroupLabel, { color: '#a78bfa' }]}>Manual Tags</Text>
          </View>
          <View style={tagStyles.tagList}>
            {adminTags.map(tag => (
              <View key={tag.id} style={[tagStyles.tagChip, tagStyles.tagChipAdmin]}>
                <Text style={[tagStyles.tagName, { color: '#c4b5fd' }]}>{tag.name}</Text>
                <X size={12} color="#a78bfa" />
              </View>
            ))}
          </View>
        </View>
      )}
      <TouchableOpacity style={tagStyles.addTagButton}>
        <Plus size={14} color="#a78bfa" />
        <Text style={tagStyles.addTagText}>Add Tag</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Detail Screen ────────────────────────────────────────────────────────────

function DetailScreen({ item, onBack }: { item: typeof MOCK_QUEUE[0]; onBack: () => void }) {
  const [selectedSceneId, setSelectedSceneId] = useState(MOCK_SCENES[0].sceneId);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const priorityStyle = getPriorityStyle(item.priority);
  const flaggedScenes = MOCK_SCENES.filter(s => s.tags.some(t => t.source === 'ai' && (t.confidence ?? 0) >= 0.8));
  const selectedScene = MOCK_SCENES.find(s => s.sceneId === selectedSceneId) ?? MOCK_SCENES[0];

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ff8c95" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{item.videoTitle}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video preview */}
        <View style={[styles.videoPreview, { overflow: 'hidden', backgroundColor: '#1a1220' }]}>
          <Image
            source={{ uri: item.videoThumbnail ?? 'https://picsum.photos/seed/default/400/225' }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* Play overlay */}
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={24} color="#fff" />
            </View>
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <User size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Uploader</Text>
            <Text style={styles.infoValue}>@{item.uploaderUsername}</Text>
          </View>
          <View style={styles.infoItem}>
            <Gauge size={14} color={priorityStyle.text} />
            <Text style={styles.infoLabel}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.text }]}>{item.priority}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Bot size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>AI Status</Text>
            <Text style={styles.infoValue}>{item.aiJobStatus}</Text>
          </View>
          <View style={styles.infoItem}>
            <Film size={14} color="#9ca3af" />
            <Text style={styles.infoLabel}>Scenes</Text>
            <Text style={styles.infoValue}>{MOCK_SCENES.length}</Text>
          </View>
        </View>

        {/* Reports warning */}
        {item.reportCount > 0 && (
          <View style={[styles.reportWarning, { flexDirection: 'column' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Flag size={16} color="#e80048" />
              <View style={{ flex: 1 }}>
                <Text style={styles.reportWarningTitle}>{item.reportCount} user reports</Text>
                <Text style={styles.reportWarningDesc}>This video has been flagged by the community</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {MOCK_REPORTS.map(r => (
                <View key={r.id} style={styles.reportItem}>
                  <Text style={styles.reportUser}>@{r.reporterUsername}</Text>
                  <Text style={styles.reportReason}>{r.reason}</Text>
                  <Text style={styles.reportDate}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI warning */}
        {flaggedScenes.length > 0 && (
          <View style={styles.aiWarning}>
            <AlertTriangle size={16} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiWarningTitle}>{flaggedScenes.length} scenes flagged by AI</Text>
              <Text style={styles.aiWarningDesc}>High-confidence violations detected</Text>
            </View>
          </View>
        )}

        {/* Assign button */}
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.assignButton}>
            <Shield size={16} color="#fff" />
            <Text style={styles.assignText}>Assign to me</Text>
          </TouchableOpacity>
        )}

        {/* Scenes section */}
        <Text style={styles.sectionTitle}>Scenes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sceneTimeline}>
          {MOCK_SCENES.map(scene => (
            <SceneTagEditorMock
              key={scene.sceneId}
              scene={scene}
              selectedSceneId={selectedSceneId}
              onSelect={setSelectedSceneId}
            />
          ))}
        </ScrollView>

        {/* Tag panel */}
        <TagPanel scene={selectedScene} />

        {/* Review notes */}
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

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { bottom: 0 }]}>
        <TouchableOpacity style={styles.rejectButton}>
          <XCircle size={18} color="#fff" />
          <Text style={styles.actionText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton}>
          <CheckCircle2 size={18} color="#fff" />
          <Text style={styles.actionText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Queue Screen ─────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: 'pending',   label: 'Pending',   Icon: Clock },
  { key: 'in_review', label: 'In Review', Icon: Eye },
  { key: 'reviewed',  label: 'Reviewed',  Icon: CheckCircle2 },
];

export default function ModerationDemo() {
  const [activeFilter, setActiveFilter] = useState('pending');
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_QUEUE[0] | null>(null);

  if (selectedItem) {
    return <DetailScreen item={selectedItem} onBack={() => setSelectedItem(null)} />;
  }

  const total = MOCK_STATS.pending + MOCK_STATS.in_review + MOCK_STATS.reviewed;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0f', paddingTop: 60, paddingHorizontal: 16 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 3 }}>MODERATION</Text>
          <Text style={styles.headerSub}>{total} items in queue</Text>
        </View>
        <Shield size={32} color="#ff8c95" />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map(({ key, label, Icon }) => {
          const isActive = activeFilter === key;
          const count = MOCK_STATS[key as keyof typeof MOCK_STATS] || 0;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setActiveFilter(key)}
            >
              <View style={styles.filterContent}>
                <Icon size={13} color={isActive ? '#e80048' : '#6b7280'} />
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{label}</Text>
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
      <FlatList
        data={MOCK_QUEUE}
        keyExtractor={item => item.queueId}
        renderItem={({ item }) => {
          const priority = getPriorityStyle(item.priority);
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedItem(item)} activeOpacity={0.7}>
              <View style={styles.cardRow}>
                <View style={[styles.thumbnail, { overflow: 'hidden' }]}>
                  {item.videoThumbnail
                    ? <Image source={{ uri: item.videoThumbnail }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <View style={[styles.thumbnailPlaceholder, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}><Film size={20} color="#555" /></View>}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.videoTitle}</Text>
                    <View style={[styles.priorityBadge2, { backgroundColor: priority.bg, borderColor: priority.border }]}>
                      <Text style={[styles.priorityText2, { color: priority.text }]}>{item.priority}</Text>
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
                    <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerSub: { color: '#6b7280', fontSize: 13, marginTop: 4, letterSpacing: 0.5 },
  filterContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#1c1320', padding: 4, borderRadius: 999 },
  filterButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 999 },
  filterButtonActive: { backgroundColor: '#2a1b32' },
  filterContent: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filterLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterLabelActive: { color: '#e80048', fontWeight: '700' },
  countBadge: { backgroundColor: 'rgba(107,114,128,0.3)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  countBadgeActive: { backgroundColor: 'rgba(232,0,72,0.2)' },
  countText: { color: '#6b7280', fontSize: 10, fontWeight: '700' },
  countTextActive: { color: '#ff8c95' },
  card: { backgroundColor: '#1a1220', marginBottom: 12, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardRow: { flexDirection: 'row', gap: 12 },
  thumbnail: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#2a1b32' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  priorityBadge2: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  priorityText2: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  uploaderText: { color: '#a78bfa', fontSize: 12, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  metaText: { color: '#9ca3af', fontSize: 10, fontWeight: '500' },
  reportChip: { backgroundColor: 'rgba(232,0,72,0.1)' },
  timeText: { color: '#4b5563', fontSize: 10, marginLeft: 'auto' },
  // Detail screen
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12, gap: 12, backgroundColor: '#0a0a0f', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,140,149,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  videoPreview: { width: '100%', height: 180, borderRadius: 16, marginTop: 16, marginBottom: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  infoItem: { flex: 1, minWidth: '45%', backgroundColor: '#141018', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  infoLabel: { color: '#6b7280', fontSize: 11, fontWeight: '500' },
  infoValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reportWarning: { backgroundColor: 'rgba(232,0,72,0.08)', borderWidth: 1, borderColor: 'rgba(232,0,72,0.2)', borderRadius: 12, padding: 14, marginBottom: 12 },
  reportWarningTitle: { color: '#ff8c95', fontSize: 13, fontWeight: '700' },
  reportWarningDesc: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  reportItem: { backgroundColor: 'rgba(232,0,72,0.06)', borderRadius: 8, padding: 10, borderLeftWidth: 2, borderLeftColor: '#e80048' },
  reportUser: { color: '#ff8c95', fontSize: 11, fontWeight: '700' },
  reportReason: { color: '#d1d5db', fontSize: 12, marginTop: 4 },
  reportDate: { color: '#4b5563', fontSize: 10, marginTop: 4 },
  aiWarning: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(245,158,11,0.08)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 12, padding: 14, marginBottom: 16 },
  aiWarningTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  aiWarningDesc: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  assignButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, marginBottom: 20 },
  assignText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sceneTimeline: { marginBottom: 16 },
  sceneThumb: { backgroundColor: '#141018', borderRadius: 12, marginRight: 10, width: 110, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  sceneThumbActive: { borderColor: '#e80048' },
  sceneThumbFlagged: { borderColor: 'rgba(245,158,11,0.4)' },
  sceneImage: { width: '100%', height: 60 },
  sceneInfo: { padding: 8 },
  sceneIndex: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sceneIndexActive: { color: '#ff8c95' },
  sceneTime: { color: '#6b7280', fontSize: 10, marginTop: 2 },
  sceneTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  sceneTagCount: { color: '#4b5563', fontSize: 10 },
  notesSection: { marginTop: 16 },
  notesToggle: { alignSelf: 'flex-start', marginBottom: 8 },
  notesToggleText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  notesInput: { backgroundColor: '#141018', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 80, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  actionBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#0a0a0f', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e80048', borderRadius: 14, padding: 16 },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 14, padding: 16 },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

const tagStyles = StyleSheet.create({
  container: { backgroundColor: '#141018', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, marginBottom: 14 },
  summary: { color: '#9ca3af', fontSize: 12, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  tagGroup: { marginBottom: 12 },
  tagGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tagGroupLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  tagChipAi: { backgroundColor: 'rgba(156,163,175,0.1)', borderWidth: 1, borderColor: 'rgba(156,163,175,0.15)' },
  tagChipDanger: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' },
  tagChipAdmin: { backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  tagName: { color: '#d1d5db', fontSize: 12, fontWeight: '600' },
  confidence: { color: '#6b7280', fontSize: 10, fontWeight: '500' },
  addTagButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(167,139,250,0.08)', borderRadius: 10, paddingVertical: 10, marginTop: 4, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)' },
  addTagText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
});

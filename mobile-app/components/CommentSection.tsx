import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as api from '@/services/api';
import type { CommentItem } from '@/services/api';

interface CommentSectionProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  onCommentsCountChange?: (count: number) => void;
}

const MAX_INDENT_LEVEL = 4;

const countNestedComments = (items: CommentItem[]): number =>
  items.reduce((total, item) => total + 1 + countNestedComments(item.replies || []), 0);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function CommentSection({ videoId, visible, onClose, onCommentsCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);

  const totalComments = useMemo(() => countNestedComments(comments), [comments]);

  useEffect(() => {
    if (visible) {
      onCommentsCountChange?.(totalComments);
    }
  }, [onCommentsCountChange, totalComments, visible]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getComments(videoId, true);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    if (visible) {
      void fetchComments();
    }
  }, [fetchComments, visible]);

  const handleReply = (item: CommentItem) => {
    setReplyTo(item);
  };

  const handleOpenProfile = (userId?: string) => {
    if (!userId) {
      return;
    }

    router.push(`/profile/${userId}` as never);
  };

  const handleSend = async () => {
    if (!newComment.trim()) {
      return;
    }

    setSending(true);
    try {
      await api.addComment(videoId, newComment.trim(), replyTo?.id);
      setNewComment('');
      setReplyTo(null);
      await fetchComments();
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setSending(false);
    }
  };

  const renderComment = useCallback(
    (item: CommentItem, depth: number = 0): React.ReactElement => {
      const indentLevel = Math.min(depth, MAX_INDENT_LEVEL);

      return (
        <View key={item.id} style={[styles.threadBlock, depth > 0 && { marginLeft: indentLevel * 14 }]}>
          <View style={styles.commentRow}>
            <TouchableOpacity onPress={() => handleOpenProfile(item.user.id)} hitSlop={8} activeOpacity={0.8}>
              <View style={[styles.avatar, depth > 0 && styles.replyAvatar]}>
                <Text style={styles.avatarText}>{(item.user.username || 'U').slice(0, 1).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.commentCard}>
              <TouchableOpacity onPress={() => handleOpenProfile(item.user.id)} hitSlop={6} activeOpacity={0.8}>
                <Text style={styles.username}>@{item.user.username}</Text>
              </TouchableOpacity>
              <Text style={styles.commentText}>{item.content}</Text>
              <View style={styles.commentActions}>
                <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
                <TouchableOpacity onPress={() => handleReply(item)} hitSlop={8}>
                  <Text style={styles.replyButton}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {item.replies && item.replies.length > 0 ? (
            <View style={styles.childrenWrap}>
              {item.replies.map((reply) => renderComment(reply, depth + 1))}
            </View>
          ) : null}
        </View>
      );
    },
    []
  );

  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Comments ({totalComments})</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Text style={styles.closeButton}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderComment(item)}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>No comments yet. Be the first!</Text>}
        />
      )}

      <View style={styles.inputContainer}>
        {replyTo ? (
          <View style={styles.replyIndicator}>
            <View style={styles.replyIndicatorCopy}>
              <Text style={styles.replyIndicatorLabel}>Replying to @{replyTo.user.username}</Text>
              <Text style={styles.replyIndicatorSnippet} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={8}>
              <Text style={styles.cancelReply}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={replyTo ? `Reply to @${replyTo.user.username}...` : 'Add a comment...'}
            placeholderTextColor="#666"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={!newComment.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '72%',
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    color: '#b8b8b8',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  threadBlock: {
    marginBottom: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  commentCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  username: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  commentText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  timestamp: {
    color: '#7d7d7d',
    fontSize: 12,
  },
  replyButton: {
    color: '#c4c4c4',
    fontSize: 12,
    fontWeight: '700',
  },
  childrenWrap: {
    marginTop: 10,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#2b2b2b',
  },
  emptyText: {
    color: '#6f6f6f',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#252525',
    backgroundColor: '#121212',
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1d1d1d',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  replyIndicatorCopy: {
    flex: 1,
  },
  replyIndicatorLabel: {
    color: '#f2f2f2',
    fontSize: 12,
    fontWeight: '700',
  },
  replyIndicatorSnippet: {
    color: '#8e8e8e',
    fontSize: 12,
    marginTop: 4,
  },
  cancelReply: {
    color: '#ff8f87',
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1d1d1d',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2b2b2b',
    maxHeight: 110,
    fontSize: 14,
  },
  sendButton: {
    minWidth: 54,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});

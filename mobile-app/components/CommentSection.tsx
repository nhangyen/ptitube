import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as api from '@/services/api';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  videoId: string;
  visible: boolean;
  onClose: () => void;
}

export default function CommentSection({ videoId, visible, onClose }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  React.useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible, videoId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await api.getComments(videoId, true);
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    
    setSending(true);
    try {
      await api.addComment(videoId, newComment.trim(), replyTo?.id);
      setNewComment('');
      setReplyTo(null);
      fetchComments();
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setSending(false);
    }
  };

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

  const renderComment = ({ item, isReply = false }: { item: Comment; isReply?: boolean }) => (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.user.username[0].toUpperCase()}</Text>
      </View>
      <View style={styles.commentContent}>
        <Text style={styles.username}>@{item.user.username}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
          {!isReply && (
            <TouchableOpacity onPress={() => setReplyTo(item)}>
              <Text style={styles.replyButton}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => (
              <View key={reply.id}>
                {renderComment({ item: reply, isReply: true })}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Comments ({comments.length})</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
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
          renderItem={({ item }) => renderComment({ item })}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
          }
        />
      )}

      <View style={styles.inputContainer}>
        {replyTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Replying to @{replyTo.user.username}
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={styles.cancelReply}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newComment.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>→</Text>
            )}
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
    height: '60%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 20,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  replyItem: {
    marginLeft: 0,
    marginTop: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  commentText: {
    color: '#ddd',
    fontSize: 14,
    marginTop: 3,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 15,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  replyButton: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  inputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyIndicatorText: {
    color: '#888',
    fontSize: 12,
  },
  cancelReply: {
    color: '#888',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

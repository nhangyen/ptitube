import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import UserConnectionsScreen from '@/components/UserConnectionsScreen';
import * as api from '@/services/api';

export default function FollowingScreen() {
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId || '';

  const loadUsers = useCallback(() => api.getFollowing(userId), [userId]);

  return (
    <UserConnectionsScreen
      title="Following"
      subtitle="Creators this account is following."
      emptyTitle="Not following anyone yet"
      emptySubtitle="Accounts followed by this profile will appear here."
      loadUsers={loadUsers}
    />
  );
}

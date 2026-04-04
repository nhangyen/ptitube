import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import UserConnectionsScreen from '@/components/UserConnectionsScreen';
import * as api from '@/services/api';

export default function FollowersScreen() {
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId || '';

  const loadUsers = useCallback(() => api.getFollowers(userId), [userId]);

  return (
    <UserConnectionsScreen
      title="Followers"
      subtitle="People who follow this creator."
      emptyTitle="No followers yet"
      emptySubtitle="When people follow this profile, they will show up here."
      loadUsers={loadUsers}
    />
  );
}

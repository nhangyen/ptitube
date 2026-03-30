import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Upload Tab — Giờ chỉ còn là trang đăng nhập / quản lý tài khoản.
 * Luồng tạo video chính đã chuyển sang nút "Tạo" (Create) ở tab bar giữa.
 */
export default function UploadScreen() {
  const { token, user, login, register, logout, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    
    setLoading(true);
    try {
      await login(username, password);
      Alert.alert('Thành công', 'Đăng nhập thành công!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    try {
      await register(username, email, password);
      Alert.alert('Thành công', 'Tạo tài khoản thành công!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Tài khoản</Text>

      {!token ? (
        <View style={styles.section}>
          <Text style={styles.label}>
            {isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Tên đăng nhập"
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          {isRegisterMode && (
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={isRegisterMode ? handleRegister : handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
            <Text style={styles.switchText}>
              {isRegisterMode ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          {/* Thông tin tài khoản */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.username || 'Người dùng'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            </View>
          </View>

          <View style={styles.hintCard}>
            <Text style={styles.hintEmoji}>💡</Text>
            <Text style={styles.hintText}>
              Bấm nút <Text style={styles.hintHighlight}>Tạo (+)</Text> ở thanh tab bên dưới 
              để quay video hoặc chọn video từ thư viện và chỉnh sửa.
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    gap: 15,
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#FF3B30',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 15,
  },
  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  // Hint
  hintCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  hintEmoji: {
    fontSize: 24,
  },
  hintText: {
    flex: 1,
    color: '#aaa',
    fontSize: 14,
    lineHeight: 22,
  },
  hintHighlight: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  // Logout
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 10,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
});

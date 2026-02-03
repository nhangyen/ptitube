import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as api from '@/services/api';
import VideoTrimmer from '@/components/VideoTrimmer';

export default function UploadScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Video trim state
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      await api.login(username, password);
      setToken(api.getAuthToken());
      Alert.alert('Success', 'Logged in successfully!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await api.register(username, email, password);
      setToken(api.getAuthToken());
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    setSelectedVideo({
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'video/mp4',
    });
    setShowTrimmer(true);
  };

  const handleTrimComplete = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
    setShowTrimmer(false);
    // Note: Actual trimming would need FFmpeg or server-side processing
    // For now we store trim points to send to backend
  };

  const handleUpload = async () => {
    if (!token) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    const videoTitle = title.trim() || 'My Video';
    const videoDesc = description.trim() || '';

    setLoading(true);
    setUploadProgress(0);

    try {
      await api.uploadVideo(selectedVideo, videoTitle, videoDesc, (progress) => {
        setUploadProgress(progress);
      });
      Alert.alert('Success', 'Video uploaded!');
      setTitle('');
      setDescription('');
      setSelectedVideo(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    api.setAuthToken(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Video Management</Text>

      {!token ? (
        <View style={styles.section}>
          <Text style={styles.label}>{isRegisterMode ? 'Create Account' : 'Login to Upload'}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
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
            placeholder="Password"
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
              <Text style={styles.buttonText}>{isRegisterMode ? 'Register' : 'Login'}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)}>
            <Text style={styles.switchText}>
              {isRegisterMode ? 'Already have an account? Login' : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.label}>Upload New Video</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Video Title"
            placeholderTextColor="#666"
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            placeholderTextColor="#666"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />

          {/* Video Selection */}
          <TouchableOpacity style={styles.selectButton} onPress={handleSelectVideo}>
            <Text style={styles.selectButtonText}>
              {selectedVideo ? '🎬 Video Selected' : '📁 Select Video'}
            </Text>
          </TouchableOpacity>

          {selectedVideo && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedText} numberOfLines={1}>
                {selectedVideo.name}
              </Text>
              {trimStart > 0 || trimEnd > 0 ? (
                <Text style={styles.trimInfo}>
                  Trimmed: {Math.round(trimStart)}s - {Math.round(trimEnd)}s
                </Text>
              ) : null}
              <TouchableOpacity onPress={() => setShowTrimmer(true)}>
                <Text style={styles.editTrimText}>✂️ Edit Trim</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.uploadButton, !selectedVideo && styles.buttonDisabled]} 
            onPress={handleUpload} 
            disabled={loading || !selectedVideo}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Upload Video</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logout} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Video Trimmer Modal */}
      <Modal visible={showTrimmer} animationType="slide">
        {selectedVideo && (
          <VideoTrimmer
            videoUri={selectedVideo.uri}
            onTrimComplete={handleTrimComplete}
            onCancel={() => setShowTrimmer(false)}
            maxDuration={60}
          />
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF3B30',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButton: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.5,
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
  selectButton: {
    backgroundColor: '#1a1a1a',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  selectedInfo: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    gap: 5,
  },
  selectedText: {
    color: '#fff',
    fontSize: 14,
  },
  trimInfo: {
    color: '#34C759',
    fontSize: 12,
  },
  editTrimText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  progressContainer: {
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    lineHeight: 20,
  },
  logout: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#666',
    fontSize: 14,
  },
});

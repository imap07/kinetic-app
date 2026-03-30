import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../api';

const SPORTS = ['Football', 'Basketball', 'Baseball', 'Tennis', 'MMA', 'Cricket'];

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updateProfile, uploadAvatar, deleteAccount, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [favoriteSports, setFavoriteSports] = useState<string[]>(
    user?.favoriteSports ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const toggleSport = (sport: string) => {
    setFavoriteSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim(),
        favoriteSports,
      });
      navigation.goBack();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to update profile. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const fileName = asset.fileName || `avatar.${asset.mimeType?.split('/')[1] || 'jpg'}`;
    const mimeType = asset.mimeType || 'image/jpeg';

    setUploadingAvatar(true);
    try {
      await uploadAvatar(asset.uri, fileName, mimeType);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to upload avatar. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone. Your account will be deactivated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            setDeleteText('');
            setShowDeleteConfirm(true);
          },
        },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    if (deleteText.trim() !== 'DELETE') {
      Alert.alert('Cancelled', 'You must type DELETE exactly to confirm.');
      return;
    }
    setShowDeleteConfirm(false);
    try {
      await deleteAccount();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to delete account. Please try again.';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        <TouchableOpacity hitSlop={12} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveBtn}>SAVE</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarLarge}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={colors.onSurfaceVariant} />
              )}
            </View>
            <TouchableOpacity
              style={styles.changePhotoBtn}
              onPress={handleChangePhoto}
              disabled={uploadingAvatar || saving}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <Feather name="camera" size={14} color={colors.onPrimary} />
                  <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholderTextColor={colors.onSurfaceDim}
                placeholder="Your display name"
                autoComplete="name"
                textContentType="name"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholderTextColor={colors.onSurfaceDim}
                placeholder="username"
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={[styles.inputWrapper, { opacity: 0.5 }]}>
              <Feather name="mail" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={user?.email ?? ''}
                editable={false}
                placeholderTextColor={colors.onSurfaceDim}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BIO</Text>
            <View style={[styles.inputWrapper, { minHeight: 80, alignItems: 'flex-start', paddingTop: 14 }]}>
              <Feather name="edit-3" size={16} color={colors.onSurfaceDim} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                placeholderTextColor={colors.onSurfaceDim}
                placeholder="Tell us about yourself..."
                multiline
                maxLength={120}
                editable={!saving}
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/120</Text>
          </View>

          {/* Favorite sports chips (multi-select) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FAVORITE SPORTS</Text>
            <View style={styles.chipRow}>
              {SPORTS.map((s) => {
                const isActive = favoriteSports.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => toggleSport(s)}
                    activeOpacity={0.7}
                    disabled={saving}
                  >
                    <Text
                      style={[styles.chipText, isActive && styles.chipTextActive]}
                    >
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Danger zone */}
          <View style={styles.dangerSection}>
            <Text style={styles.dangerLabel}>DANGER ZONE</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
              <Feather name="trash-2" size={16} color="#FF4444" />
              <Text style={styles.dangerBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete account confirmation modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>CONFIRM DELETION</Text>
            <Text style={styles.modalDescription}>
              Type DELETE to confirm account deletion.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="Type DELETE"
              placeholderTextColor={colors.onSurfaceDim}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDeleteBtn,
                  deleteText.trim() !== 'DELETE' && { opacity: 0.4 },
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteText.trim() !== 'DELETE'}
              >
                <Text style={styles.modalDeleteText}>DELETE ACCOUNT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    letterSpacing: 1,
  },
  saveBtn: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  changePhotoText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },

  fieldGroup: {
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 14,
  },
  atSign: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.onSurfaceDim,
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceDim,
    textAlign: 'right',
    marginTop: 4,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: 'rgba(202,253,0,0.12)',
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.primary,
  },

  dangerSection: {
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  dangerLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceDim,
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dangerBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#FF4444',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: '#FF4444',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  modalDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
  modalInput: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.onSurface,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

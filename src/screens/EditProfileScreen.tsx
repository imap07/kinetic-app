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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [displayName, setDisplayName] = useState('Alex Thompson');
  const [username, setUsername] = useState('@alexthompson');
  const [email, setEmail] = useState('alex@example.com');
  const [bio, setBio] = useState('Sports prediction enthusiast. Master rank.');
  const [favoriteSport, setFavoriteSport] = useState('Football');

  const SPORTS = ['Football', 'Basketball', 'Baseball', 'Tennis', 'MMA', 'Cricket'];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        <TouchableOpacity hitSlop={12}>
          <Text style={styles.saveBtn}>SAVE</Text>
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
              <Ionicons name="person" size={40} color={colors.onSurfaceVariant} />
            </View>
            <TouchableOpacity style={styles.changePhotoBtn}>
              <Feather name="camera" size={14} color={colors.onPrimary} />
              <Text style={styles.changePhotoText}>CHANGE PHOTO</Text>
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
                autoComplete="name"
                textContentType="name"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={styles.input}
                value={username.replace('@', '')}
                onChangeText={(t) => setUsername(`@${t}`)}
                placeholderTextColor={colors.onSurfaceDim}
                autoCapitalize="none"
                autoComplete="username"
                textContentType="username"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Feather name="mail" size={16} color={colors.onSurfaceDim} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor={colors.onSurfaceDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
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
                multiline
                maxLength={120}
              />
            </View>
            <Text style={styles.charCount}>{bio.length}/120</Text>
          </View>

          {/* Favorite sport chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>FAVORITE SPORT</Text>
            <View style={styles.chipRow}>
              {SPORTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, favoriteSport === s && styles.chipActive]}
                  onPress={() => setFavoriteSport(s)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.chipText, favoriteSport === s && styles.chipTextActive]}
                  >
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Danger zone */}
          <View style={styles.dangerSection}>
            <Text style={styles.dangerLabel}>DANGER ZONE</Text>
            <TouchableOpacity style={styles.dangerBtn}>
              <Feather name="trash-2" size={16} color="#FF4444" />
              <Text style={styles.dangerBtnText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
});

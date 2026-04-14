import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { leaguesApi } from '../api/leagues';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeaguesStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

type Props = NativeStackScreenProps<LeaguesStackParamList, 'QRScanner'>;

export function QRScannerScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { tokens } = useAuth();
  const [permission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestCameraPermission();
    }
  }, [permission, requestCameraPermission]);

  const handleBarCodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (scanned || loading) return;
      setScanned(true);

      // Extract invite code from URL
      const match = data.match(/kineticapp\.ca\/join\/([A-Za-z0-9]+)/);
      if (!match) {
        Alert.alert(t('leagues.invalidQR'), '', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
        return;
      }

      const inviteCode = match[1];
      const token = tokens?.accessToken;
      if (!token) {
        setScanned(false);
        return;
      }

      setLoading(true);
      try {
        const league = await leaguesApi.getByInviteCode(token, inviteCode);
        setLoading(false);
        navigation.replace('CoinLeagueDetail', { leagueId: league._id });
      } catch {
        setLoading(false);
        Alert.alert(t('leagues.leagueNotFound'), '', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    },
    [scanned, loading, tokens, navigation, t],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const requestPermission = useCallback(async () => {
    await requestCameraPermission();
  }, [requestCameraPermission]);

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={48} color={colors.onSurfaceDim} />
          <Text style={styles.permissionText}>
            {t('leagues.cameraPermission')}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.7}
          >
            <Text style={styles.permissionButtonText}>
              {t('leagues.requestPermission')}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backButtonAlt} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={colors.onSurface} />
          <Text style={styles.backButtonText}>{t('common.back') || 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with transparent center */}
      <View style={styles.overlayContainer}>
        {/* Top */}
        <View style={styles.overlaySection} />
        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySection} />
          <View style={styles.scanArea}>
            {/* Corner borders */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.overlaySection} />
        </View>
        {/* Bottom */}
        <View style={styles.overlaySection} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leagues.scanQR')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {t('leagues.pointCamera')}
        </Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  // Overlay
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 17, 0.75)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  // Corner decorations
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 29, 33, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  // Instruction
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 14, 17, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Permission denied state
  permissionCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    padding: spacing['3xl'],
    borderRadius: borderRadius.lg,
    gap: spacing.lg,
  },
  permissionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  backButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xl'],
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
});

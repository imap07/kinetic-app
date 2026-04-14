import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { ModalCloseButton } from './ModalCloseButton';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface LeagueQRModalProps {
  visible: boolean;
  onClose: () => void;
  league: {
    name: string;
    inviteCode: string;
    entryFee: number;
    sport: string;
    prizePool: number;
  };
}

export function LeagueQRModal({ visible, onClose, league }: LeagueQRModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `https://kineticapp.ca/join/${league.inviteCode}`;

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(league.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [league.inviteCode]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Join my league "${league.name}" on Kinetic! ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      // User cancelled or share failed — no action needed
    }
  }, [league.name, inviteUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('leagues.qrTitle')}</Text>
            <ModalCloseButton onClose={onClose} variant="sheet" />
          </View>

          {/* League Name */}
          <Text style={styles.leagueName}>{league.name}</Text>

          {/* League Info Chips */}
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Ionicons name="trophy-outline" size={14} color={colors.primary} />
              <Text style={styles.chipText}>
                {league.entryFee > 0 ? `${league.entryFee} KC` : 'Free'}
              </Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="football-outline" size={14} color={colors.primary} />
              <Text style={styles.chipText}>{league.sport}</Text>
            </View>
            {league.prizePool > 0 && (
              <View style={styles.chip}>
                <Ionicons name="gift-outline" size={14} color={colors.primary} />
                <Text style={styles.chipText}>{league.prizePool} KC</Text>
              </View>
            )}
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <View style={styles.qrBackground}>
              <QRCode
                value={inviteUrl}
                size={200}
                backgroundColor="#FFFFFF"
                color="#0B0E11"
              />
            </View>
            <Text style={styles.scanText}>{t('leagues.scanToJoin')}</Text>
          </View>

          {/* Invite Code Section */}
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>{t('leagues.orUseCode')}</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{league.inviteCode}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? colors.primary : colors.onSurface}
              />
              <Text style={[styles.secondaryButtonText, copied && styles.copiedText]}>
                {copied ? t('leagues.codeCopied') : t('leagues.copyCode')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.primaryButtonText}>{t('leagues.shareInvite')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['5xl'],
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  leagueName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrBackground: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  scanText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.onSurfaceDim,
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurfaceDim,
    marginBottom: spacing.sm,
  },
  codeBox: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  copiedText: {
    color: colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});

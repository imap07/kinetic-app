/**
 * Bottom-sheet thread for short-form pick comments.
 *
 * Opens when the user taps the comment icon on a PickFeedCard.
 * Renders the thread newest-first, lets the user post a ≤50-char
 * reply, and (for their own comments) swipe-to-delete. Built as
 * a Modal so it stacks above the picks-feed list and reactions
 * bottom sheet without z-fighting.
 *
 * Keyboard handling uses KeyboardAvoidingView with platform-correct
 * behavior so the input never disappears under the system keyboard.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { commentsApi, type PickComment } from '../api/comments';
import { colors } from '../theme';

const MAX_CHARS = 50;

interface Props {
  predictionId: string | null;
  onClose: () => void;
  onCountChanged?: (predictionId: string, delta: number) => void;
}

export function PickCommentsSheet({
  predictionId,
  onClose,
  onCountChanged,
}: Props) {
  const { tokens } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PickComment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [body, setBody] = useState('');
  const inputRef = useRef<TextInput | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'more') => {
      if (!predictionId || !tokens?.accessToken) return;
      if (mode === 'initial') setLoading(true);
      else setLoadingMore(true);
      try {
        const page = await commentsApi.list(tokens.accessToken, predictionId, {
          limit: 30,
          cursor: mode === 'more' && cursor ? cursor : undefined,
        });
        setItems((prev) =>
          mode === 'more' ? [...prev, ...page.items] : page.items,
        );
        setCursor(page.nextCursor);
      } catch {
        // Transient failure — leave whatever was already on screen
        // and let the user pull-to-refresh / retry by reopening.
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [predictionId, tokens?.accessToken, cursor],
  );

  // Reset and fetch whenever the target pick changes.
  useEffect(() => {
    if (!predictionId) {
      setItems([]);
      setCursor(null);
      setBody('');
      return;
    }
    setItems([]);
    setCursor(null);
    load('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionId]);

  const handlePost = useCallback(async () => {
    if (!predictionId || !tokens?.accessToken) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    if (trimmed.length > MAX_CHARS) return;
    setPosting(true);
    try {
      const created = await commentsApi.create(
        tokens.accessToken,
        predictionId,
        trimmed,
      );
      setItems((prev) => [created, ...prev]);
      setBody('');
      onCountChanged?.(predictionId, +1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      const raw = typeof e?.message === 'string' ? e.message : '';
      Alert.alert(
        t('common.error'),
        raw && /\s/.test(raw) ? raw : t('common.tryAgainLater'),
      );
    } finally {
      setPosting(false);
    }
  }, [body, predictionId, tokens?.accessToken, t, onCountChanged]);

  /**
   * UGC report flow — required by Apple 1.2(iii). Surfaces the four
   * canonical reasons as ActionSheet rows; backend accepts an
   * optional detail string which we leave to a future "Other →
   * describe" sub-screen if we ever see spam patterns we can't
   * categorise. The comment auto-hides once N users report it.
   */
  const handleReport = useCallback(
    (comment: PickComment) => {
      if (!tokens?.accessToken) return;
      const submit = async (
        reason: 'spam' | 'abuse' | 'inappropriate' | 'other',
      ) => {
        try {
          await commentsApi.report(tokens.accessToken, comment.id, reason);
          Alert.alert(
            t('comments.reportThanksTitle', { defaultValue: 'Thanks for the heads-up' }),
            t('comments.reportThanksBody', {
              defaultValue: "We'll review this comment. You won't see it again here.",
            }),
          );
          // Optimistic hide for the reporter regardless of threshold.
          setItems((prev) => prev.filter((c) => c.id !== comment.id));
        } catch (e: any) {
          const raw = typeof e?.message === 'string' ? e.message : '';
          Alert.alert(
            t('common.error'),
            raw && /\s/.test(raw) ? raw : t('common.tryAgainLater'),
          );
        }
      };
      Alert.alert(
        t('comments.reportPromptTitle', { defaultValue: 'Report comment?' }),
        comment.body,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('comments.reasonSpam', { defaultValue: 'Spam' }),
            onPress: () => submit('spam'),
          },
          {
            text: t('comments.reasonAbuse', { defaultValue: 'Abuse or harassment' }),
            onPress: () => submit('abuse'),
          },
          {
            text: t('comments.reasonInappropriate', { defaultValue: 'Inappropriate' }),
            onPress: () => submit('inappropriate'),
            style: 'destructive',
          },
          {
            text: t('comments.reasonOther', { defaultValue: 'Other' }),
            onPress: () => submit('other'),
          },
        ],
      );
    },
    [tokens?.accessToken, t],
  );

  const handleDelete = useCallback(
    (comment: PickComment) => {
      if (!tokens?.accessToken || !predictionId) return;
      Alert.alert(
        t('comments.deletePromptTitle', { defaultValue: 'Delete comment?' }),
        comment.body,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('comments.delete', { defaultValue: 'Delete' }),
            style: 'destructive',
            onPress: async () => {
              try {
                await commentsApi.remove(tokens.accessToken, comment.id);
                setItems((prev) => prev.filter((c) => c.id !== comment.id));
                onCountChanged?.(predictionId, -1);
              } catch {
                /* ignore */
              }
            },
          },
        ],
      );
    },
    [tokens?.accessToken, predictionId, t, onCountChanged],
  );

  return (
    <Modal
      visible={!!predictionId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
          >
            <View style={styles.grabber} />

            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {t('comments.title', { defaultValue: 'Comments' })}
              </Text>
              <Text style={styles.subTitle}>
                {t('comments.subtitle', {
                  defaultValue: 'Keep it short — {{n}} chars max',
                  n: MAX_CHARS,
                })}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : items.length === 0 ? (
              <Text style={styles.empty}>
                {t('comments.empty', { defaultValue: 'Be the first to chime in.' })}
              </Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(c) => c.id}
                style={styles.list}
                onEndReachedThreshold={0.4}
                onEndReached={() => cursor && !loadingMore && load('more')}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator
                      color={colors.primary}
                      style={{ marginVertical: 12 }}
                    />
                  ) : null
                }
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    {item.avatar ? (
                      <ExpoImage
                        source={{ uri: item.avatar }}
                        style={styles.avatar}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>
                          {item.displayName?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.displayName}
                        {item.isMine ? ` ${t('common.you')}` : ''}
                      </Text>
                      <Text style={styles.body}>{item.body}</Text>
                    </View>
                    {item.isMine ? (
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        hitSlop={10}
                        style={styles.deleteBtn}
                      >
                        <Feather name="trash-2" size={14} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleReport(item)}
                        hitSlop={10}
                        style={styles.deleteBtn}
                      >
                        <Feather name="flag" size={14} color={colors.onSurfaceVariant} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={body}
                onChangeText={(v) => setBody(v.slice(0, MAX_CHARS))}
                placeholder={t('comments.placeholder', {
                  defaultValue: 'Say something…',
                })}
                placeholderTextColor={colors.onSurfaceDim}
                maxLength={MAX_CHARS}
                editable={!posting}
                returnKeyType="send"
                onSubmitEditing={handlePost}
              />
              <Text style={styles.counter}>
                {body.length}/{MAX_CHARS}
              </Text>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!body.trim() || posting) && styles.sendBtnDisabled,
                ]}
                onPress={handlePost}
                disabled={!body.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Feather name="arrow-up" size={16} color={colors.onPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '80%',
    minHeight: '50%',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: 8,
  },

  headerRow: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  subTitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },

  list: {
    flex: 1,
  },
  empty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 36,
    fontStyle: 'italic',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: 'rgba(202,253,0,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(202,253,0,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    color: colors.primary,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
    marginTop: 2,
    lineHeight: 19,
  },
  deleteBtn: {
    padding: 4,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 999,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  counter: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    minWidth: 28,
    textAlign: 'right',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});

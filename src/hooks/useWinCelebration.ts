import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { predictionsApi, type PredictionData } from '../api/predictions';
import { useAuth } from '../contexts/AuthContext';

const SEEN_KEY = 'win_celebration_seen_ids_v1';

const MAX_SEEN_TO_KEEP = 100;
const RECENCY_HOURS = 48;

async function readSeen(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function writeSeen(ids: string[]): Promise<void> {
  try {
    const trimmed = ids.slice(-MAX_SEEN_TO_KEEP);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore — best effort */
  }
}

function isRecent(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const resolvedAt = new Date(iso).getTime();
  if (Number.isNaN(resolvedAt)) return false;
  const now = Date.now();
  return now - resolvedAt <= RECENCY_HOURS * 60 * 60 * 1000;
}

export function useWinCelebration() {
  const { tokens } = useAuth();
  const [pending, setPending] = useState<PredictionData | null>(null);
  const didCheck = useRef(false);

  const check = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;

    try {
      const seen = await readSeen();
      const res = await predictionsApi.getMyPicks(token, { status: 'resolved', limit: 10 });
      const candidate = res.predictions.find(
        (p) => p.status === 'won' && isRecent(p.resolvedAt) && !seen.includes(p._id),
      );
      if (candidate) setPending(candidate);
    } catch {
      /* silent — this is a nice-to-have, not critical */
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    if (didCheck.current) return;
    didCheck.current = true;
    check();
  }, [check]);

  const dismiss = useCallback(async () => {
    if (!pending) return;
    const seen = await readSeen();
    await writeSeen([...seen, pending._id]);
    setPending(null);
  }, [pending]);

  return { pendingWin: pending, dismissWin: dismiss };
}

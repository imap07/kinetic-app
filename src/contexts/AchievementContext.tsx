import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  AchievementUnlockOverlay,
  AchievementUnlockData,
} from '../components/AchievementUnlockOverlay';

interface AchievementContextValue {
  /** Call this when SSE delivers an achievement_unlocked event */
  showAchievementUnlock: (data: AchievementUnlockData) => void;
}

const AchievementContext = createContext<AchievementContextValue>({
  showAchievementUnlock: () => {},
});

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<AchievementUnlockData | null>(null);
  const queue = useRef<AchievementUnlockData[]>([]);
  const showing = useRef(false);

  const showNext = useCallback(() => {
    if (queue.current.length === 0) {
      showing.current = false;
      return;
    }
    const next = queue.current.shift()!;
    setCurrent(next);
    showing.current = true;
  }, []);

  const showAchievementUnlock = useCallback(
    (data: AchievementUnlockData) => {
      queue.current.push(data);
      if (!showing.current) {
        showNext();
      }
    },
    [showNext],
  );

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    // Show next queued achievement after a small delay
    setTimeout(showNext, 300);
  }, [showNext]);

  return (
    <AchievementContext.Provider value={{ showAchievementUnlock }}>
      {children}
      <AchievementUnlockOverlay achievement={current} onDismiss={handleDismiss} />
    </AchievementContext.Provider>
  );
}

export function useAchievements(): AchievementContextValue {
  return useContext(AchievementContext);
}

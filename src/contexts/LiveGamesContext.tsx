import React, { createContext, useContext, useState, useCallback } from 'react';

interface LiveGamesState {
  liveCount: number;
  setLiveCount: (count: number) => void;
}

const LiveGamesContext = createContext<LiveGamesState>({
  liveCount: 0,
  setLiveCount: () => {},
});

export function LiveGamesProvider({ children }: { children: React.ReactNode }) {
  const [liveCount, setLiveCountState] = useState(0);

  const setLiveCount = useCallback((count: number) => {
    setLiveCountState(count);
  }, []);

  return (
    <LiveGamesContext.Provider value={{ liveCount, setLiveCount }}>
      {children}
    </LiveGamesContext.Provider>
  );
}

export const useLiveGames = () => useContext(LiveGamesContext);

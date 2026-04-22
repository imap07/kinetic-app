import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWinCelebration } from '../useWinCelebration';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ tokens: { accessToken: 'test-token' } }),
}));

const mockGetMyPicks = jest.fn();
jest.mock('../../api/predictions', () => ({
  predictionsApi: {
    getMyPicks: (...args: unknown[]) => mockGetMyPicks(...args),
  },
}));

const SEEN_KEY = 'win_celebration_seen_ids_v1';

function makePick(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'pick-1',
    status: 'won',
    resolvedAt: new Date().toISOString(),
    pointsAwarded: 100,
    ...overrides,
  };
}

describe('useWinCelebration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('surfaces a recent WON pick that has not been seen', async () => {
    mockGetMyPicks.mockResolvedValueOnce({ predictions: [makePick()] });

    const { result } = renderHook(() => useWinCelebration());

    await waitFor(() => expect(result.current.pendingWin).not.toBeNull());
    expect(result.current.pendingWin?._id).toBe('pick-1');
  });

  it('skips picks already in the seen list', async () => {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(['pick-1']));
    mockGetMyPicks.mockResolvedValueOnce({ predictions: [makePick()] });

    const { result } = renderHook(() => useWinCelebration());

    await waitFor(() => expect(mockGetMyPicks).toHaveBeenCalled());
    expect(result.current.pendingWin).toBeNull();
  });

  it('skips picks older than 48h', async () => {
    const old = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    mockGetMyPicks.mockResolvedValueOnce({ predictions: [makePick({ resolvedAt: old })] });

    const { result } = renderHook(() => useWinCelebration());

    await waitFor(() => expect(mockGetMyPicks).toHaveBeenCalled());
    expect(result.current.pendingWin).toBeNull();
  });

  it('skips non-won picks', async () => {
    mockGetMyPicks.mockResolvedValueOnce({
      predictions: [makePick({ status: 'lost' }), makePick({ _id: 'p2', status: 'void' })],
    });

    const { result } = renderHook(() => useWinCelebration());

    await waitFor(() => expect(mockGetMyPicks).toHaveBeenCalled());
    expect(result.current.pendingWin).toBeNull();
  });

  it('dismiss persists the id so it is not shown again', async () => {
    mockGetMyPicks.mockResolvedValueOnce({ predictions: [makePick()] });

    const { result } = renderHook(() => useWinCelebration());
    await waitFor(() => expect(result.current.pendingWin).not.toBeNull());

    await act(async () => {
      await result.current.dismissWin();
    });

    expect(result.current.pendingWin).toBeNull();
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    expect(JSON.parse(raw as string)).toContain('pick-1');
  });

  it('is silent when the API throws', async () => {
    mockGetMyPicks.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useWinCelebration());

    await waitFor(() => expect(mockGetMyPicks).toHaveBeenCalled());
    expect(result.current.pendingWin).toBeNull();
  });
});

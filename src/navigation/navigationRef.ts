import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate from outside React components (e.g. push notification handler).
 * Silently no-ops when the navigator is not yet mounted.
 */
export function navigate(name: string, params?: Record<string, unknown>): void {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef as any).navigate(name as any, params as any);
  }
}

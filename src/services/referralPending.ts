import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kinetic.pendingReferralCode.v1';

/**
 * Stash a referral code captured from a deep link before the user
 * has completed signup. Consumed at the end of onboarding (auto-apply)
 * and cleared on success — regardless of whether the apply actually
 * went through, since we don't want to retry forever if the code was
 * invalid or already used.
 */
export const pendingReferral = {
  async set(code: string): Promise<void> {
    await AsyncStorage.setItem(KEY, code.trim().toUpperCase());
  },
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(KEY);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};

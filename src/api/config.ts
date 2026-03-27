import { Platform } from 'react-native';

const DEV_HOST = Platform.select({
  android: '10.0.2.2',
  default: 'localhost',
});

export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:3001/api`
  : 'https://api.kinetic.io/api';

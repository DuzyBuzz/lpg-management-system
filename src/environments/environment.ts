import { resolveApiBaseUrl, resolveFirebaseConfig } from './environment.shared';

export const environment = {
  production: false,
  apiBaseUrl: resolveApiBaseUrl(),
  firebaseConfig: resolveFirebaseConfig()
} as const;
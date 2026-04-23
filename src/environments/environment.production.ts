import { resolveApiBaseUrl, resolveFirebaseConfig } from './environment.shared';

export const environment = {
  production: true,
  apiBaseUrl: resolveApiBaseUrl(),
  firebaseConfig: resolveFirebaseConfig()
} as const;
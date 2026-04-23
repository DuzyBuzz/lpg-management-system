type RuntimeEnvironment = {
  API_BASE_URL?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_AUTH_DOMAIN?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_STORAGE_BUCKET?: string;
  FIREBASE_MESSAGING_SENDER_ID?: string;
  FIREBASE_APP_ID?: string;
  FIREBASE_MEASUREMENT_ID?: string;
};

export type FirebaseEnvironmentConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

const runtimeEnvironment = (globalThis as typeof globalThis & {
  __env?: RuntimeEnvironment;
}).__env;

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');
const trimValue = (value?: string) => value?.trim() ?? '';

const isLocalHostname = (hostname: string) => {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const getRuntimeValue = (key: keyof RuntimeEnvironment) => trimValue(runtimeEnvironment?.[key]);

export const resolveApiBaseUrl = () => {
  const apiBaseUrl = trimTrailingSlash(getRuntimeValue('API_BASE_URL'));

  if (!apiBaseUrl) {
    return '';
  }

  if (typeof window === 'undefined') {
    return apiBaseUrl;
  }

  try {
    const parsedUrl = new URL(apiBaseUrl, window.location.origin);

    if (isLocalHostname(parsedUrl.hostname) && !isLocalHostname(window.location.hostname)) {
      return '';
    }
  } catch {
    return '';
  }

  return apiBaseUrl;
};

export const resolveFirebaseConfig = (): FirebaseEnvironmentConfig | null => {
  const firebaseConfig: FirebaseEnvironmentConfig = {
    apiKey: getRuntimeValue('FIREBASE_API_KEY'),
    authDomain: getRuntimeValue('FIREBASE_AUTH_DOMAIN'),
    projectId: getRuntimeValue('FIREBASE_PROJECT_ID'),
    storageBucket: getRuntimeValue('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getRuntimeValue('FIREBASE_MESSAGING_SENDER_ID'),
    appId: getRuntimeValue('FIREBASE_APP_ID'),
    measurementId: getRuntimeValue('FIREBASE_MEASUREMENT_ID') || undefined
  };

  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.storageBucket ||
    !firebaseConfig.messagingSenderId ||
    !firebaseConfig.appId
  ) {
    return null;
  }

  return firebaseConfig;
};
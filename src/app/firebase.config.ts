import { getAnalytics, isSupported } from 'firebase/analytics';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { environment } from '../environments/environment';

const getFirebaseApp = (): FirebaseApp | null => {
  const firebaseConfig = environment.firebaseConfig;

  if (!firebaseConfig) {
    return null;
  }

  return getApps()[0] ?? initializeApp(firebaseConfig);
};

export const initializeFirebaseAnalytics = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const analyticsSupported = await isSupported();

    if (!analyticsSupported) {
      return;
    }

    const firebaseApp = getFirebaseApp();

    if (!firebaseApp) {
      return;
    }

    getAnalytics(firebaseApp);
  } catch {
    // Analytics is optional for the dashboard shell.
  }
};
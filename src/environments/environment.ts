import { firebaseConfig } from './firebase-config';

/** Live site settings. */
export const environment = {
  /** True only in local development: talk to the Firebase emulator, never real data. */
  useEmulators: false,
  firebase: firebaseConfig,
};

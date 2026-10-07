import { firebaseConfig } from './firebase-config';

/** Local development: uses the Firebase emulator (npm run emulators), never real data. */
export const environment = {
  useEmulators: true,
  firebase: { ...firebaseConfig, projectId: 'demo-leave-planner' },
};

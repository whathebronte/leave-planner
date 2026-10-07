import { InjectionToken, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';

/** One shared Firebase connection for the whole app. Only services use these. */
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FirebaseApp', {
  providedIn: 'root',
  factory: () => initializeApp(environment.firebase),
});

export const FIREBASE_AUTH = new InjectionToken<Auth>('FirebaseAuth', {
  providedIn: 'root',
  factory: () => {
    const auth = getAuth(inject(FIREBASE_APP));
    if (environment.useEmulators)
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    return auth;
  },
});

/**
 * Firestore keeps a copy on the device, so the planner opens offline and any
 * taps made offline are sent once you are back online.
 */
export const FIRESTORE = new InjectionToken<Firestore>('Firestore', {
  providedIn: 'root',
  factory: () => {
    const db = initializeFirestore(inject(FIREBASE_APP), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (environment.useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
    return db;
  },
});

import { Injectable, computed, inject, signal } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  getRedirectResult,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase';

/**
 * Keeps someone signed in at all times.
 * By default that is an invisible "anonymous" sign-in (needed to talk to the
 * database). Signing in with Google replaces it, so the planner can be tied
 * to your account.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);

  readonly user = signal<User | null>(null);
  /** True once we know who is signed in (anonymous or Google). */
  readonly ready = computed(() => this.user() !== null);
  readonly isGoogle = computed(
    () => this.user()?.providerData.some((p) => p.providerId === 'google.com') ?? false,
  );
  readonly displayName = computed(() => this.user()?.displayName ?? this.user()?.email ?? '');
  readonly error = signal<string | null>(null);
  /** Goes up by one each time someone completes a Google sign-in (popup or redirect). */
  readonly googleSignIns = signal(0);

  constructor() {
    getRedirectResult(this.auth)
      .then((result) => {
        if (result?.user) this.googleSignIns.update((n) => n + 1);
      })
      .catch(() => this.error.set('Google sign-in did not finish. Please try again.'));
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.user.set(user);
      } else {
        this.user.set(null);
        signInAnonymously(this.auth).catch(() =>
          this.error.set('Could not connect. Check your internet connection and reload the page.'),
        );
      }
    });
  }

  async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(this.auth, provider);
      this.googleSignIns.update((n) => n + 1);
      return result.user;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(this.auth, provider);
        return null;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request')
        return null;
      throw e;
    }
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}

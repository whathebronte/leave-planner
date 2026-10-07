import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  DocumentReference,
  FieldPath,
  Unsubscribe,
  collection,
  deleteField,
  doc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AVAILABLE_YEARS } from '../data/holidays';
import {
  DEFAULT_ALLOWANCE,
  DateKey,
  DayValue,
  Mode,
  PLANNERS,
  Planner,
  USERS,
  plannerFromFirestore,
} from '../models/planner.model';
import { AuthService } from './auth.service';
import { costOfChange, leaveUsed, nextValue } from './calendar';
import { LocalBackupService } from './local-backup.service';
import { FIRESTORE } from './firebase';

/**
 * What the screen should show.
 *  loading   : still connecting
 *  waiting   : offline and this device has no copy yet (we wait, we never save a blank planner)
 *  ready     : planner is open
 *  not-found : the link points to a planner that does not exist
 *  private   : the planner belongs to a Google account that is not signed in here
 *  error     : something else went wrong (message in `errorMessage`)
 */
export type LoadStatus = 'loading' | 'waiting' | 'ready' | 'not-found' | 'private' | 'error';
export type SyncStatus = 'saved' | 'saving' | 'offline' | 'error';

interface UndoStep {
  key: DateKey;
  previous: DayValue | null;
}

const URL_PARAM = 'uid'; // kept from the old app so existing links keep working

/**
 * The single place that reads and writes the planner.
 *
 * How this prevents the "my data disappeared" bug:
 *  1. It never creates or overwrites a whole planner when loading. The old app
 *     saved a blank planner whenever it could not see yours (for example on a
 *     weak connection), which wiped it.
 *  2. Each tap only changes that one day, so two devices or an old open tab
 *     cannot overwrite each other's changes.
 *  3. A copy of the last synced planner is kept on the device (LocalBackupService).
 */
@Injectable({ providedIn: 'root' })
export class PlannerStore {
  private readonly db = inject(FIRESTORE);
  private readonly auth = inject(AuthService);
  private readonly backup = inject(LocalBackupService);

  private unsubscribe: Unsubscribe | null = null;
  private readonly undoStack = signal<UndoStep[]>([]);

  readonly status = signal<LoadStatus>('loading');
  readonly sync = signal<SyncStatus>('saved');
  readonly errorMessage = signal<string>('');
  readonly planner = signal<Planner | null>(null);
  readonly plannerId = signal<string | null>(null);
  /** Short messages for the pop-up toast. */
  readonly notice = signal<{ text: string; at: number } | null>(null);

  readonly mode = signal<Mode>('leave');
  readonly year = signal<number>(defaultYear());

  readonly leaves = computed(() => this.planner()?.leaves ?? {});
  readonly allowance = computed(
    () => this.planner()?.totals[String(this.year())] ?? DEFAULT_ALLOWANCE,
  );
  readonly used = computed(() => leaveUsed(this.leaves(), this.year()));
  readonly remaining = computed(() => this.allowance() - this.used());
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly isOwnedByMe = computed(() => {
    const owner = this.planner()?.ownerUid;
    return !!owner && owner === this.auth.user()?.uid;
  });
  readonly shareLink = computed(() => {
    const id = this.plannerId();
    if (!id) return '';
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set(URL_PARAM, id);
    return url.toString();
  });

  constructor() {
    // Open a planner once we are signed in, and reconnect whenever the account changes
    // (permissions depend on who is signed in).
    let started = false;
    effect(() => {
      const uid = this.auth.user()?.uid;
      if (!uid) return;
      untracked(() => {
        if (!started) {
          started = true;
          void this.start();
        } else if (this.plannerId()) {
          this.open(this.plannerId()!);
        }
      });
    });

    // After a Google sign-in, tie the planner to that account.
    effect(() => {
      if (this.auth.googleSignIns() === 0) return;
      untracked(() => void this.linkToGoogleAccount());
    });
  }

  // ---------- Opening ----------

  private async start(): Promise<void> {
    const fromUrl = parsePlannerId(window.location.href);
    if (fromUrl) return this.open(fromUrl);

    const user = this.auth.user();
    if (this.auth.isGoogle() && user) {
      try {
        const snap = await getDocFromServer(doc(this.db, USERS, user.uid));
        const id = snap.get('plannerId');
        if (typeof id === 'string') return this.open(id);
      } catch {
        // offline: fall through to the planner remembered on this device
      }
    }

    const remembered = this.backup.lastPlannerId();
    if (remembered) return this.open(remembered);

    await this.createPlanner(null);
  }

  /** Start listening to a planner. Any previous planner is disconnected first. */
  open(id: string): void {
    this.unsubscribe?.();
    if (id !== this.plannerId()) {
      this.planner.set(null);
      this.undoStack.set([]);
    }
    this.plannerId.set(id);
    this.status.set('loading');
    this.setUrl(id);

    this.unsubscribe = onSnapshot(
      this.ref(id),
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) {
          // "Not found" from the device's copy only means we have not reached the server yet.
          // Never save anything here: wait for the server's answer.
          this.status.set(snap.metadata.fromCache ? 'waiting' : 'not-found');
          return;
        }
        const planner = plannerFromFirestore(id, snap.data());
        this.planner.set(planner);
        this.status.set('ready');
        this.sync.set(
          snap.metadata.hasPendingWrites ? 'saving' : snap.metadata.fromCache ? 'offline' : 'saved',
        );
        this.backup.remember(planner, !snap.metadata.fromCache && !snap.metadata.hasPendingWrites);
      },
      (error) => {
        if (error.code === 'permission-denied') {
          this.status.set('private');
        } else {
          this.errorMessage.set('Could not load your planner. Check your connection and reload.');
          this.status.set('error');
        }
      },
    );
  }

  /** Accepts a planner ID or a full link. */
  openFromInput(input: string): boolean {
    const id = parsePlannerId(input.trim()) ?? (isPlannerId(input.trim()) ? input.trim() : null);
    if (!id) return false;
    this.open(id);
    return true;
  }

  async createPlanner(ownerUid: string | null): Promise<void> {
    const ref = doc(collection(this.db, PLANNERS));
    // A brand new random ID, so this can never overwrite an existing planner.
    const write = setDoc(ref, {
      schemaVersion: 2,
      ownerUid,
      totals: {},
      leaves: {},
      updatedAt: serverTimestamp(),
    });
    this.open(ref.id);
    try {
      await write;
    } catch {
      this.say('Could not create a planner. Check your connection.');
    }
  }

  // ---------- Editing ----------

  /** A tap on a work day. */
  tap(key: DateKey): void {
    const current = this.leaves()[key];
    const next = nextValue(current, this.mode());
    if (this.remaining() - costOfChange(current, next) < 0) {
      this.say('Not enough leave left');
      return;
    }
    this.undoStack.update((s) => [...s.slice(-49), { key, previous: current ?? null }]);
    this.writeDay(key, next);
  }

  undo(): void {
    const steps = this.undoStack();
    const last = steps.at(-1);
    if (!last) return;
    this.undoStack.set(steps.slice(0, -1));
    this.writeDay(last.key, last.previous);
  }

  setAllowance(days: number): void {
    const id = this.plannerId();
    if (!id || !(days >= 0)) return;
    this.write(
      updateDoc(
        this.ref(id),
        new FieldPath('totals', String(this.year())),
        days,
        'schemaVersion',
        2,
        'updatedAt',
        serverTimestamp(),
      ),
    );
  }

  /** Replaces all bookings and allowances (used by "restore backup"). */
  replaceAll(data: Pick<Planner, 'leaves' | 'totals'>): void {
    const id = this.plannerId();
    if (!id) return;
    this.undoStack.set([]);
    this.write(
      updateDoc(this.ref(id), {
        leaves: data.leaves,
        totals: data.totals,
        schemaVersion: 2,
        updatedAt: serverTimestamp(),
      }),
    );
  }

  private writeDay(key: DateKey, value: DayValue | null): void {
    const id = this.plannerId();
    if (!id) return;
    // Only this one day is sent. Nothing else in the planner is touched.
    this.write(
      updateDoc(
        this.ref(id),
        new FieldPath('leaves', key),
        value ?? deleteField(),
        'schemaVersion',
        2,
        'updatedAt',
        serverTimestamp(),
      ),
    );
  }

  private write(pending: Promise<void>): void {
    this.sync.set('saving');
    pending.catch((e: { code?: string }) => {
      this.sync.set('error');
      this.say(
        e.code === 'permission-denied'
          ? 'You do not have permission to edit this planner'
          : 'Could not save. Your last change may be lost.',
      );
    });
  }

  // ---------- Google account ----------

  /**
   * Runs right after a Google sign-in.
   * If the account already has a planner, open it. Otherwise this planner becomes the
   * account's planner, and from then on only that account can open it.
   */
  private async linkToGoogleAccount(): Promise<void> {
    const user = this.auth.user();
    if (!user || !this.auth.isGoogle()) return;
    const userRef = doc(this.db, USERS, user.uid);
    await this.whenSettled();
    try {
      const existing = await getDocFromServer(userRef);
      const savedId = existing.get('plannerId');
      if (typeof savedId === 'string' && savedId !== this.plannerId()) {
        this.open(savedId);
        this.say('Opened the planner saved to your Google account');
        return;
      }

      const id = this.plannerId();
      const planner = this.planner();
      if (!id || !planner || this.status() !== 'ready') {
        await this.createPlanner(user.uid);
        await setDoc(userRef, { plannerId: this.plannerId() });
        return;
      }
      if (planner.ownerUid && planner.ownerUid !== user.uid) return;
      if (!planner.ownerUid)
        await updateDoc(this.ref(id), { ownerUid: user.uid, schemaVersion: 2 });
      await setDoc(userRef, { plannerId: id });
      this.say('Planner saved to your Google account');
    } catch {
      this.say('Signed in, but could not link your planner. Check your connection and try again.');
    }
  }

  // ---------- Helpers ----------

  /** Waits (up to 15 seconds) for the current planner to finish loading. */
  private async whenSettled(): Promise<void> {
    for (let i = 0; i < 60 && (this.status() === 'loading' || this.plannerId() === null); i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  say(text: string): void {
    this.notice.set({ text, at: Date.now() });
  }

  setYear(year: number): void {
    if (AVAILABLE_YEARS.includes(year)) this.year.set(year);
  }

  private ref(id: string): DocumentReference {
    return doc(this.db, PLANNERS, id);
  }

  private setUrl(id: string): void {
    const url = new URL(window.location.href);
    if (url.searchParams.get(URL_PARAM) === id) return;
    url.searchParams.set(URL_PARAM, id);
    // replaceState, so the back button does not fill up with old IDs
    window.history.replaceState(null, '', url);
  }
}

/** Pulls the planner ID out of a link like ".../?uid=abc123". */
export function parsePlannerId(text: string): string | null {
  try {
    const id = new URL(text).searchParams.get(URL_PARAM);
    return id && isPlannerId(id) ? id : null;
  } catch {
    return null;
  }
}

export function isPlannerId(text: string): boolean {
  return /^[A-Za-z0-9_-]{10,128}$/.test(text);
}

function defaultYear(): number {
  const now = new Date().getFullYear();
  return AVAILABLE_YEARS.includes(now) ? now : AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1];
}

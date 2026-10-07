import { Injectable } from '@angular/core';
import { Planner } from '../models/planner.model';

const LAST_ID = 'lp.lastPlannerId';
const BACKUP = 'lp.backup.';

export interface LocalBackup {
  savedAt: string;
  planner: Planner;
}

/**
 * A safety copy on this device. Remembers which planner you last opened and the
 * last version confirmed by the server, so a wiped planner can be restored.
 * Browsers can clear this storage, so it is a backup, not the main copy.
 */
@Injectable({ providedIn: 'root' })
export class LocalBackupService {
  lastPlannerId(): string | null {
    return read(LAST_ID);
  }

  /** `confirmed` is true when this exact version is safely on the server. */
  remember(planner: Planner, confirmed: boolean): void {
    write(LAST_ID, planner.id);
    // Never replace a backup that has bookings with an empty planner:
    // that empty planner is exactly the situation the backup is for.
    if (!confirmed || Object.keys(planner.leaves).length === 0) return;
    const backup: LocalBackup = { savedAt: new Date().toISOString(), planner };
    write(BACKUP + planner.id, JSON.stringify(backup));
  }

  get(plannerId: string): LocalBackup | null {
    const raw = read(BACKUP + plannerId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalBackup;
    } catch {
      return null;
    }
  }

  clear(plannerId: string): void {
    try {
      localStorage.removeItem(BACKUP + plannerId);
    } catch {
      // storage unavailable (private browsing): nothing to clear
    }
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or blocked: the backup is best effort
  }
}

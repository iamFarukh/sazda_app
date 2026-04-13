import { pullPrayerLogs, pushAllPrayerLogsForUser } from './firebase/prayerTrackerFirestore';
import { usePrayerTrackerStore } from '../store/prayerTrackerStore';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPullMs = 0;
const MIN_PULL_INTERVAL_MS = 60_000;

let currentSyncUid: string | null = null;

export function setPrayerSyncUser(uid: string | null): void {
  currentSyncUid = uid;
}

export function schedulePrayerCloudSync(delayMs = 2000): void {
  const uid = currentSyncUid;
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const s = usePrayerTrackerStore.getState();
    void pushAllPrayerLogsForUser(uid, s.byDay).catch(() => {});
  }, delayMs);
}

export async function pullAndMergePrayer(uid: string | null, force = false): Promise<void> {
  if (!uid) return;
  const now = Date.now();
  if (!force && now - lastPullMs < MIN_PULL_INTERVAL_MS) return;
  lastPullMs = now;
  try {
    const remoteLogs = await pullPrayerLogs(uid);
    usePrayerTrackerStore.getState().mergeFromRemote(remoteLogs);
  } catch {
    /* errors logged inside firestore service */
  }
}

export function flushPrayerCloudSync(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const uid = currentSyncUid;
  if (!uid) return;
  const s = usePrayerTrackerStore.getState();
  void pushAllPrayerLogsForUser(uid, s.byDay).catch(() => {});
}

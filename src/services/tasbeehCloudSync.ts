import { pullTasbeehLogs, pushTasbeehLog } from './firebase/tasbeehFirestore';
import { useTasbeehStore } from '../store/tasbeehStore';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPullMs = 0;
const MIN_PULL_INTERVAL_MS = 60_000;

let currentSyncUid: string | null = null;

export function setTasbeehSyncUser(uid: string | null): void {
  currentSyncUid = uid;
}

export function scheduleTasbeehCloudSync(delayMs = 2000): void {
  const uid = currentSyncUid;
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const s = useTasbeehStore.getState();
    const log = {
      cycles: s.cycles,
      updatedAt: s.lastUpdatedAt || Date.now()
    };
    void pushTasbeehLog(uid, log).catch(() => {});
  }, delayMs);
}

export async function pullAndMergeTasbeeh(uid: string | null, force = false): Promise<void> {
  if (!uid) return;
  const now = Date.now();
  if (!force && now - lastPullMs < MIN_PULL_INTERVAL_MS) return;
  lastPullMs = now;
  try {
    const remoteLog = await pullTasbeehLogs(uid);
    if (remoteLog) {
      useTasbeehStore.getState().mergeFromRemote(remoteLog);
    }
  } catch {
    /* errors logged inside firestore service */
  }
}

export function flushTasbeehCloudSync(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const uid = currentSyncUid;
  if (!uid) return;
  const s = useTasbeehStore.getState();
  const log = {
    cycles: s.cycles,
    updatedAt: s.lastUpdatedAt || Date.now()
  };
  void pushTasbeehLog(uid, log).catch(() => {});
}

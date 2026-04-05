import { pullZakatCycles, pullZakatPayments, pushAllZakatForUser } from './firebase/zakatFirestore';
import { useZakatStore } from '../store/zakatStore';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPullMs = 0;
const MIN_PULL_INTERVAL_MS = 60_000;

/** Set from a root/tool screen when Firebase user changes. */
let currentSyncUid: string | null = null;

export function setZakatSyncUser(uid: string | null): void {
  currentSyncUid = uid;
}

/** Debounced upload — avoids hammering Firestore on every keystroke. */
export function scheduleZakatCloudSync(delayMs = 2000): void {
  const uid = currentSyncUid;
  if (!uid) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const s = useZakatStore.getState();
    const cycles = Object.values(s.cyclesById);
    const payments = Object.values(s.paymentsById);
    void pushAllZakatForUser(uid, cycles, payments).catch(() => {
      /* errors logged inside zakatFirestore */
    });
  }, delayMs);
}

/** Pull remote changes; merges by per-document updatedAtMs (newer wins). Throttled. */
export async function pullAndMergeZakat(uid: string | null, force = false): Promise<void> {
  if (!uid) return;
  const now = Date.now();
  if (!force && now - lastPullMs < MIN_PULL_INTERVAL_MS) return;
  lastPullMs = now;
  try {
    const [cycles, payments] = await Promise.all([pullZakatCycles(uid), pullZakatPayments(uid)]);
    useZakatStore.getState().mergeFromRemote(cycles, payments);
  } catch {
    /* pull* already catch internally; guard coordinator */
  }
}

export function flushZakatCloudSync(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const uid = currentSyncUid;
  if (!uid) return;
  const s = useZakatStore.getState();
  void pushAllZakatForUser(uid, Object.values(s.cyclesById), Object.values(s.paymentsById)).catch(
    () => {},
  );
}

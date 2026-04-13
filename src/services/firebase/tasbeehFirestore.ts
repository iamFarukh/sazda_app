import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseApp, getFirebaseDb } from './client';

export type TasbeehRemoteLog = {
  cycles: number;
  updatedAt: number;
};

let loggedTasbeehPermissionHint = false;

function logTasbeehError(context: string, e: unknown) {
  if (!__DEV__) return;
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
  if (code === 'permission-denied') {
    if (!loggedTasbeehPermissionHint) {
      loggedTasbeehPermissionHint = true;
      console.warn(
        '[tasbeehFirestore] Firestore permission-denied. Deploy rules from firebase/firestore.rules.',
      );
    }
    return;
  }
  console.warn(`[tasbeehFirestore] ${context}`, e);
}

export async function pullTasbeehLogs(uid: string): Promise<TasbeehRemoteLog | null> {
  if (!getFirebaseApp()) return null;
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'users', uid, 'tasbeeh', 'progress'));
    if (snap.exists()) {
      return snap.data() as TasbeehRemoteLog;
    }
    return null;
  } catch (e) {
    logTasbeehError('pullTasbeehLogs', e);
    return null;
  }
}

export async function pushTasbeehLog(uid: string, log: TasbeehRemoteLog): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await setDoc(doc(getFirebaseDb(), 'users', uid, 'tasbeeh', 'progress'), log, { merge: true });
  } catch (e) {
    logTasbeehError('pushTasbeehLog', e);
  }
}

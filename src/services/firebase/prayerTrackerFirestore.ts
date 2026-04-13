import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import type { DayPrayerLog } from '../../store/prayerTrackerStore';
import { getFirebaseApp, getFirebaseDb } from './client';

let loggedPrayerPermissionHint = false;

function logPrayerFirestoreError(context: string, e: unknown) {
  if (!__DEV__) return;
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
  if (code === 'permission-denied') {
    if (!loggedPrayerPermissionHint) {
      loggedPrayerPermissionHint = true;
      console.warn(
        '[prayerTrackerFirestore] Firestore permission-denied. Deploy rules from firebase/firestore.rules.',
      );
    }
    return;
  }
  console.warn(`[prayerTrackerFirestore] ${context}`, e);
}

function logsCol(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'prayerTracker');
}

export async function pullPrayerLogs(uid: string): Promise<Record<string, DayPrayerLog>> {
  if (!getFirebaseApp()) return {};
  try {
    const snap = await getDocs(logsCol(uid));
    const result: Record<string, DayPrayerLog> = {};
    snap.docs.forEach(d => {
      result[d.id] = d.data() as DayPrayerLog;
    });
    return result;
  } catch (e) {
    logPrayerFirestoreError('pullPrayerLogs', e);
    return {};
  }
}

export async function pushPrayerLog(uid: string, dateKey: string, log: DayPrayerLog): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await setDoc(doc(getFirebaseDb(), 'users', uid, 'prayerTracker', dateKey), log, { merge: true });
  } catch (e) {
    logPrayerFirestoreError(`pushPrayerLog ${dateKey}`, e);
  }
}

export async function deletePrayerLogRemote(uid: string, dateKey: string): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await deleteDoc(doc(getFirebaseDb(), 'users', uid, 'prayerTracker', dateKey));
  } catch (e) {
    logPrayerFirestoreError(`deletePrayerLogRemote ${dateKey}`, e);
  }
}

export async function pushAllPrayerLogsForUser(
  uid: string,
  byDay: Record<string, DayPrayerLog>
): Promise<void> {
  if (!getFirebaseApp()) return;
  const jobs = Object.entries(byDay).map(([dateKey, log]) => pushPrayerLog(uid, dateKey, log));
  await Promise.allSettled(jobs);
}

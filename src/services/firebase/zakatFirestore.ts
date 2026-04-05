/**
 * Firestore paths: users/{uid}/zakatCycles/{cycleId}, users/{uid}/zakatPayments/{paymentId}
 *
 * Deploy rules from firebase/firestore.rules (includes these subcollections).
 * Without rules, calls fail with permission-denied — errors are caught so the app keeps working offline.
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { ZakatCycle, ZakatPayment } from '../../features/zakat/types';
import { getFirebaseApp, getFirebaseDb } from './client';

/** One hint per session — permission-denied is almost always undeployed Firestore rules. */
let loggedZakatPermissionHint = false;

function logZakatFirestoreError(context: string, e: unknown) {
  if (!__DEV__) return;
  const code =
    typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code?: string }).code)
      : '';
  if (code === 'permission-denied') {
    if (!loggedZakatPermissionHint) {
      loggedZakatPermissionHint = true;
      console.warn(
        '[zakatFirestore] Firestore permission-denied for Zakat sync. Deploy rules from firebase/firestore.rules ' +
          '(paths: users/{uid}/zakatCycles, users/{uid}/zakatPayments). Until then, Zakat works offline only.',
      );
    }
    return;
  }
  console.warn(`[zakatFirestore] ${context}`, e);
}

function cyclesCol(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'zakatCycles');
}

function paymentsCol(uid: string) {
  return collection(getFirebaseDb(), 'users', uid, 'zakatPayments');
}

export async function pullZakatCycles(uid: string): Promise<ZakatCycle[]> {
  if (!getFirebaseApp()) return [];
  try {
    const snap = await getDocs(cyclesCol(uid));
    return snap.docs.map(d => d.data() as ZakatCycle);
  } catch (e) {
    logZakatFirestoreError('pullZakatCycles', e);
    return [];
  }
}

export async function pullZakatPayments(uid: string): Promise<ZakatPayment[]> {
  if (!getFirebaseApp()) return [];
  try {
    const snap = await getDocs(paymentsCol(uid));
    return snap.docs.map(d => d.data() as ZakatPayment);
  } catch (e) {
    logZakatFirestoreError('pullZakatPayments', e);
    return [];
  }
}

export async function pushZakatCycle(uid: string, cycle: ZakatCycle): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await setDoc(doc(getFirebaseDb(), 'users', uid, 'zakatCycles', cycle.id), cycle, { merge: true });
  } catch (e) {
    logZakatFirestoreError(`pushZakatCycle ${cycle.id}`, e);
  }
}

export async function pushZakatPayment(uid: string, payment: ZakatPayment): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await setDoc(doc(getFirebaseDb(), 'users', uid, 'zakatPayments', payment.id), payment, {
      merge: true,
    });
  } catch (e) {
    logZakatFirestoreError(`pushZakatPayment ${payment.id}`, e);
  }
}

export async function deleteZakatPaymentRemote(uid: string, paymentId: string): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await deleteDoc(doc(getFirebaseDb(), 'users', uid, 'zakatPayments', paymentId));
  } catch (e) {
    logZakatFirestoreError(`deleteZakatPaymentRemote ${paymentId}`, e);
  }
}

export async function deleteZakatCycleRemote(uid: string, cycleId: string): Promise<void> {
  if (!getFirebaseApp()) return;
  try {
    await deleteDoc(doc(getFirebaseDb(), 'users', uid, 'zakatCycles', cycleId));
  } catch (e) {
    logZakatFirestoreError(`deleteZakatCycleRemote ${cycleId}`, e);
  }
}

/**
 * Full upload of current local state (after debounced local edits).
 * Uses allSettled so one failed doc does not reject the whole batch.
 */
export async function pushAllZakatForUser(
  uid: string,
  cycles: ZakatCycle[],
  payments: ZakatPayment[],
): Promise<void> {
  if (!getFirebaseApp()) return;
  const jobs: Promise<void>[] = [
    ...cycles.map(c => pushZakatCycle(uid, c)),
    ...payments.map(p => pushZakatPayment(uid, p)),
  ];
  await Promise.allSettled(jobs);
}

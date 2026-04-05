import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newZakatId } from '../features/zakat/ids';
import type { ZakatCycle, ZakatPayment, ZakatPaymentCategory } from '../features/zakat/types';
import { validateCycleTotalPaise, validatePaymentAmountPaise } from '../features/zakat/derive';
import { mmkv } from '../services/storage';
import { deleteZakatCycleRemote, deleteZakatPaymentRemote } from '../services/firebase/zakatFirestore';
import { scheduleZakatCloudSync } from '../services/zakatCloudSync';

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkv.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkv.set(name, value),
  removeItem: (name: string) => mmkv.remove(name),
}));

type State = {
  /** ISO 4217 — future multi-currency; UI defaults to INR. */
  currency: 'INR';
  cyclesById: Record<string, ZakatCycle>;
  paymentsById: Record<string, ZakatPayment>;
  /** Newest-first order of cycle ids. */
  cycleIds: string[];
  activeCycleId: string | null;

  ensureDefaultCycle: () => void;
  createCycle: (input: {
    label: string;
    year: number;
    startDateIso: string;
    endDateIso?: string | null;
    totalZakatPaise: number;
    zakatableWealthPaise?: number | null;
    notes?: string;
  }) => string;
  updateCycle: (
    cycleId: string,
    patch: Partial<
      Pick<
        ZakatCycle,
        | 'label'
        | 'year'
        | 'startDateIso'
        | 'endDateIso'
        | 'totalZakatPaise'
        | 'zakatableWealthPaise'
        | 'notes'
        | 'archived'
      >
    >,
  ) => void;
  setActiveCycle: (cycleId: string | null) => void;
  deleteCycle: (cycleId: string, uid: string | null) => Promise<void>;

  addPayment: (input: {
    cycleId: string;
    amountPaise: number;
    category: ZakatPaymentCategory;
    paidAtIso: string;
    note?: string;
  }) => { ok: true; id: string } | { ok: false; error: string };
  updatePayment: (
    paymentId: string,
    patch: Partial<Pick<ZakatPayment, 'amountPaise' | 'category' | 'paidAtIso' | 'note'>>,
  ) => { ok: true } | { ok: false; error: string };
  deletePayment: (paymentId: string, uid: string | null) => Promise<void>;

  mergeFromRemote: (cycles: ZakatCycle[], payments: ZakatPayment[]) => void;
};

const now = () => Date.now();

function sortCycleIds(cyclesById: Record<string, ZakatCycle>, ids: string[]): string[] {
  return [...ids].sort(
    (a, b) => (cyclesById[b]?.createdAtMs ?? 0) - (cyclesById[a]?.createdAtMs ?? 0),
  );
}

export const useZakatStore = create<State>()(
  persist(
    (set, get) => ({
      currency: 'INR',
      cyclesById: {},
      paymentsById: {},
      cycleIds: [],
      activeCycleId: null,

      ensureDefaultCycle: () => {
        const { cycleIds, createCycle } = get();
        if (cycleIds.length > 0) return;
        const y = new Date().getFullYear();
        const iso = new Date(y, 0, 1).toISOString().slice(0, 10);
        createCycle({
          label: `Zakat ${y}`,
          year: y,
          startDateIso: iso,
          endDateIso: null,
          totalZakatPaise: 0,
          zakatableWealthPaise: null,
          notes: '',
        });
      },

      createCycle: input => {
        const t = now();
        const id = newZakatId();
        const total = Math.max(0, Math.round(input.totalZakatPaise));
        const cycle: ZakatCycle = {
          id,
          label: input.label.trim() || `Zakat ${input.year}`,
          year: input.year,
          startDateIso: input.startDateIso,
          endDateIso: input.endDateIso ?? null,
          totalZakatPaise: total,
          zakatableWealthPaise: input.zakatableWealthPaise ?? null,
          notes: input.notes?.trim() ?? '',
          archived: false,
          createdAtMs: t,
          updatedAtMs: t,
        };
        set(s => ({
          cyclesById: { ...s.cyclesById, [id]: cycle },
          cycleIds: sortCycleIds({ ...s.cyclesById, [id]: cycle }, [id, ...s.cycleIds.filter(x => x !== id)]),
          activeCycleId: s.activeCycleId ?? id,
        }));
        scheduleZakatCloudSync();
        return id;
      },

      updateCycle: (cycleId, patch) => {
        const c = get().cyclesById[cycleId];
        if (!c) return;
        if (patch.totalZakatPaise !== undefined) {
          const err = validateCycleTotalPaise(patch.totalZakatPaise);
          if (err) return;
        }
        const next: ZakatCycle = {
          ...c,
          ...patch,
          totalZakatPaise:
            patch.totalZakatPaise !== undefined
              ? Math.max(0, Math.round(patch.totalZakatPaise))
              : c.totalZakatPaise,
          updatedAtMs: now(),
        };
        set(s => ({
          cyclesById: { ...s.cyclesById, [cycleId]: next },
        }));
        scheduleZakatCloudSync();
      },

      setActiveCycle: cycleId => {
        if (cycleId && !get().cyclesById[cycleId]) return;
        set({ activeCycleId: cycleId });
        scheduleZakatCloudSync(4000);
      },

      deleteCycle: async (cycleId, uid) => {
        const payments = Object.values(get().paymentsById).filter(p => p.cycleId === cycleId);
        set(s => {
          const { [cycleId]: _, ...restC } = s.cyclesById;
          const restP = { ...s.paymentsById };
          payments.forEach(p => {
            delete restP[p.id];
          });
          const cycleIds = s.cycleIds.filter(x => x !== cycleId);
          let activeCycleId = s.activeCycleId;
          if (activeCycleId === cycleId) activeCycleId = cycleIds[0] ?? null;
          return {
            cyclesById: restC,
            paymentsById: restP,
            cycleIds,
            activeCycleId,
          };
        });
        if (uid) {
          await deleteZakatCycleRemote(uid, cycleId);
          await Promise.all(payments.map(p => deleteZakatPaymentRemote(uid, p.id)));
        }
        scheduleZakatCloudSync(500);
      },

      addPayment: input => {
        const err = validatePaymentAmountPaise(input.amountPaise);
        if (err) return { ok: false, error: err };
        if (!get().cyclesById[input.cycleId]) return { ok: false, error: 'Invalid cycle' };
        const t = now();
        const id = newZakatId();
        const p: ZakatPayment = {
          id,
          cycleId: input.cycleId,
          amountPaise: Math.round(input.amountPaise),
          category: input.category,
          paidAtIso: input.paidAtIso,
          note: input.note?.trim() ?? '',
          createdAtMs: t,
          updatedAtMs: t,
        };
        set(s => ({
          paymentsById: { ...s.paymentsById, [id]: p },
        }));
        scheduleZakatCloudSync();
        return { ok: true, id };
      },

      updatePayment: (paymentId, patch) => {
        const p = get().paymentsById[paymentId];
        if (!p) return { ok: false, error: 'Payment not found' };
        if (patch.amountPaise !== undefined) {
          const err = validatePaymentAmountPaise(patch.amountPaise);
          if (err) return { ok: false, error: err };
        }
        const next: ZakatPayment = {
          ...p,
          ...patch,
          amountPaise:
            patch.amountPaise !== undefined ? Math.round(patch.amountPaise) : p.amountPaise,
          note: patch.note !== undefined ? patch.note.trim() : p.note,
          updatedAtMs: now(),
        };
        set(s => ({
          paymentsById: { ...s.paymentsById, [paymentId]: next },
        }));
        scheduleZakatCloudSync();
        return { ok: true };
      },

      deletePayment: async (paymentId, uid) => {
        set(s => {
          const { [paymentId]: _, ...rest } = s.paymentsById;
          return { paymentsById: rest };
        });
        if (uid) {
          await deleteZakatPaymentRemote(uid, paymentId);
        }
        scheduleZakatCloudSync(500);
      },

      mergeFromRemote: (remoteCycles, remotePayments) => {
        set(s => {
          const cyclesById = { ...s.cyclesById };
          const paymentsById = { ...s.paymentsById };
          const idSet = new Set(s.cycleIds);

          for (const c of remoteCycles) {
            const local = cyclesById[c.id];
            if (!local || c.updatedAtMs >= local.updatedAtMs) {
              cyclesById[c.id] = c;
            }
            idSet.add(c.id);
          }
          for (const p of remotePayments) {
            if (!cyclesById[p.cycleId]) continue;
            const local = paymentsById[p.id];
            if (!local || p.updatedAtMs >= local.updatedAtMs) {
              paymentsById[p.id] = p;
            }
          }

          const cycleIds = sortCycleIds(cyclesById, Array.from(idSet));
          let activeCycleId = s.activeCycleId;
          if (activeCycleId && !cyclesById[activeCycleId]) {
            activeCycleId = cycleIds[0] ?? null;
          }
          if (!activeCycleId && cycleIds[0]) activeCycleId = cycleIds[0];

          return { cyclesById, paymentsById, cycleIds, activeCycleId };
        });
      },
    }),
    {
      name: 'sazda-zakat',
      storage: mmkvStorage,
      version: 1,
      partialize: s => ({
        currency: s.currency,
        cyclesById: s.cyclesById,
        paymentsById: s.paymentsById,
        cycleIds: s.cycleIds,
        activeCycleId: s.activeCycleId,
      }),
    },
  ),
);

// Single source of truth for "which club does this athlete belong to right now".
//
// Rules (in priority order), always evaluated against today's date:
// 1. An ACTIVE loan wins — while the loan is running the athlete is at the
//    borrowing club (emprestado).
// 2. Otherwise the ACTIVE owning contract (permanent/youth/any non-loan) wins —
//    so when a loan expires the athlete automatically returns to the holder club.
// 3. If nothing is active, fall back to the contract flagged as current, then to
//    the most recent one by start_date, and the status becomes "free".
//
// Archived contracts are always ignored.

export interface ContractLike {
  club_name: string;
  contract_type?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean | null;
  is_archived?: boolean | null;
}

export type CurrentContractStatus = "emprestado" | "contracted" | "free";

export interface ResolvedContract<T extends ContractLike> {
  /** Contract that defines the current club (may be an expired one as fallback). */
  contract: T | null;
  /** Owning (non-loan) active contract, when the athlete is out on loan. */
  ownerContract: T | null;
  club: string | null;
  status: CurrentContractStatus;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isActive(c: ContractLike, today: string): boolean {
  if (c.start_date && c.start_date > today) return false;
  if (c.end_date && c.end_date < today) return false;
  return true;
}

function byStartDesc<T extends ContractLike>(a: T, b: T) {
  return (b.start_date || "").localeCompare(a.start_date || "");
}

export function resolveCurrentContract<T extends ContractLike>(
  contracts: T[] | null | undefined
): ResolvedContract<T> {
  const today = todayISO();
  const list = (contracts ?? []).filter((c) => !c.is_archived && c.club_name);

  if (list.length === 0) {
    return { contract: null, ownerContract: null, club: null, status: "free" };
  }

  const active = list.filter((c) => isActive(c, today)).sort(byStartDesc);
  const activeLoan = active.find((c) => (c.contract_type ?? "").toLowerCase() === "loan") ?? null;
  const activeOwner = active.find((c) => (c.contract_type ?? "").toLowerCase() !== "loan") ?? null;

  if (activeLoan) {
    return {
      contract: activeLoan,
      ownerContract: activeOwner,
      club: activeLoan.club_name,
      status: "emprestado",
    };
  }

  if (activeOwner) {
    return {
      contract: activeOwner,
      ownerContract: null,
      club: activeOwner.club_name,
      status: "contracted",
    };
  }

  const fallback = list.find((c) => c.is_current) ?? [...list].sort(byStartDesc)[0];
  return { contract: fallback, ownerContract: null, club: fallback?.club_name ?? null, status: "free" };
}

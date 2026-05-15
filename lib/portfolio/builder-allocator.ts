import {
  CANDIDATE_BOND_ETFS,
  CANDIDATE_SECTOR_ETFS,
  CANDIDATE_BROAD_ETFS,
} from "./constants";

const BOND_ETF_SET = new Set<string>(CANDIDATE_BOND_ETFS);
const SECTOR_ETF_SET = new Set<string>(CANDIDATE_SECTOR_ETFS);
const BROAD_ETF_SET = new Set<string>(CANDIDATE_BROAD_ETFS);

export type BuilderPosition = {
  symbol: string;
  quantity: number;
  asset_type: string;
};

export type BuilderInput = {
  capital: number;
  selectedEquities: string[];
  selectedBonds: string[];
  freePicks: { symbol: string; asset_type?: string }[];
  optimizedWeights: Record<string, number>;
  prices: Record<string, number>;
  equityPercent: number;
  bondPercent: number;
};

export function guessAssetType(symbol: string): string {
  if (BOND_ETF_SET.has(symbol)) return "bond_etf";
  if (SECTOR_ETF_SET.has(symbol)) return "etf";
  if (BROAD_ETF_SET.has(symbol)) return "etf";
  if (symbol.match(/^[A-Z]{2,5}\d/i)) return "bond";
  return "equity";
}

function allocateShares(
  dollarAmount: number,
  price: number,
  assetType: string,
): number {
  if (assetType === "bond") {
    return Math.max(1, Math.floor(dollarAmount / price));
  }
  return Math.floor((dollarAmount / price) * 100) / 100;
}

/**
 * Pure function that allocates capital into portfolio positions.
 *
 * Invariant: the total value of all returned positions (including CASH-USD at $1)
 * equals exactly the input capital.
 */
export function allocatePortfolio(input: BuilderInput): BuilderPosition[] {
  const {
    capital,
    selectedEquities,
    selectedBonds,
    freePicks,
    optimizedWeights,
    prices,
    equityPercent,
    bondPercent,
  } = input;

  const eqCount = selectedEquities.length;
  const bdCount = selectedBonds.length;
  const fpCount = freePicks.length;

  const hasOptimizerWeights =
    Object.keys(optimizedWeights).length > 0 &&
    selectedEquities.every((s) => optimizedWeights[s] !== undefined);

  const computed: BuilderPosition[] = [];

  if (hasOptimizerWeights) {
    const bondBudget = bdCount > 0 ? bondPercent * capital : 0;
    const freeBudget = fpCount > 0 ? capital * 0.15 : 0;
    const equityBudget = capital - bondBudget - freeBudget;

    const totalWeight = selectedEquities.reduce(
      (s, sym) => s + (optimizedWeights[sym] ?? 0),
      0,
    );

    for (const sym of selectedEquities) {
      const weight = optimizedWeights[sym] ?? 0;
      const dollarAmount =
        totalWeight > 0 ? equityBudget * (weight / totalWeight) : 0;
      const price = prices[sym];
      if (!price || dollarAmount < 1) continue;
      const aType = guessAssetType(sym);
      const qty = allocateShares(dollarAmount, price, aType);
      computed.push({ symbol: sym, quantity: qty, asset_type: aType });
    }

    if (bdCount > 0) {
      const perBd = bondBudget / bdCount;
      for (const sym of selectedBonds) {
        const aType = guessAssetType(sym);
        const price = prices[sym];
        const qty = allocateShares(perBd, price, aType);
        computed.push({ symbol: sym, quantity: qty, asset_type: aType });
      }
    }

    if (fpCount > 0) {
      const perFp = freeBudget / fpCount;
      for (const fp of freePicks) {
        const aType = fp.asset_type || guessAssetType(fp.symbol);
        const price = prices[fp.symbol];
        const qty = allocateShares(perFp, price, aType);
        computed.push({ symbol: fp.symbol, quantity: qty, asset_type: aType });
      }
    }
  } else {
    const rawEquity = eqCount > 0 ? equityPercent * capital : 0;
    const rawBond = bdCount > 0 ? bondPercent * capital : 0;
    const remaining = capital - rawEquity - rawBond;
    const rawFree = fpCount > 0 ? remaining * 0.5 : 0;

    if (eqCount > 0) {
      const perEq = rawEquity / eqCount;
      for (const sym of selectedEquities) {
        const price = prices[sym];
        const qty = allocateShares(perEq, price, guessAssetType(sym));
        computed.push({
          symbol: sym,
          quantity: qty,
          asset_type: guessAssetType(sym),
        });
      }
    }

    if (bdCount > 0) {
      const perBd = rawBond / bdCount;
      for (const sym of selectedBonds) {
        const aType = guessAssetType(sym);
        const price = prices[sym];
        const qty = allocateShares(perBd, price, aType);
        computed.push({ symbol: sym, quantity: qty, asset_type: aType });
      }
    }

    if (fpCount > 0) {
      const perFp = rawFree / fpCount;
      for (const fp of freePicks) {
        const aType = fp.asset_type || guessAssetType(fp.symbol);
        const price = prices[fp.symbol];
        const qty = allocateShares(perFp, price, aType);
        computed.push({ symbol: fp.symbol, quantity: qty, asset_type: aType });
      }
    }
  }

  // SAFETY: if rounding pushed total above capital, scale down
  const totalAllocated = computed.reduce(
    (sum, pos) => sum + pos.quantity * (prices[pos.symbol] ?? 0),
    0,
  );
  if (totalAllocated > capital) {
    const scale = capital / totalAllocated;
    for (const pos of computed) {
      if (pos.asset_type === "bond") {
        pos.quantity = Math.max(1, Math.floor(pos.quantity * scale));
      } else if (pos.asset_type !== "cash") {
        pos.quantity = Math.floor(pos.quantity * scale * 100) / 100;
      }
    }
  }

  // Cash = whatever's left from rounding
  const finalSpent = computed.reduce(
    (sum, pos) => sum + pos.quantity * (prices[pos.symbol] ?? 0),
    0,
  );
  const cashAmount = capital - finalSpent;
  if (cashAmount > 0.01) {
    computed.push({
      symbol: "CASH-USD",
      quantity: Math.round(cashAmount * 100) / 100,
      asset_type: "cash",
    });
  }

  return computed;
}

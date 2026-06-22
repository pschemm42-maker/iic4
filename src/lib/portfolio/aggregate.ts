export function calculateWeightedAverageCost(
  existingShares: number,
  existingAverageCost: number,
  newShares: number,
  newCostPerShare: number,
) {
  const totalShares = existingShares + newShares;
  if (totalShares <= 0) {
    return 0;
  }

  return (
    (existingShares * existingAverageCost + newShares * newCostPerShare) /
    totalShares
  );
}

export function earliestPurchaseDate(
  existingDate: string | null,
  newDate: string | null,
) {
  if (!existingDate) {
    return newDate;
  }

  if (!newDate) {
    return existingDate;
  }

  return existingDate <= newDate ? existingDate : newDate;
}

export type PurchaseLotValues = {
  shares: number;
  cost_per_share: number;
  purchase_date: string | null;
};

export function aggregateHoldingsFromPurchases(purchases: PurchaseLotValues[]) {
  if (purchases.length === 0) {
    return {
      shares: 0,
      averageCostPerShare: 0,
      purchaseDate: null,
    };
  }

  let totalShares = 0;
  let totalCost = 0;
  let purchaseDate: string | null = null;

  for (const purchase of purchases) {
    totalShares += purchase.shares;
    totalCost += purchase.shares * purchase.cost_per_share;
    purchaseDate = earliestPurchaseDate(purchaseDate, purchase.purchase_date);
  }

  return {
    shares: totalShares,
    averageCostPerShare: totalShares > 0 ? totalCost / totalShares : 0,
    purchaseDate,
  };
}

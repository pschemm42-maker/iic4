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

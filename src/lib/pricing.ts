export interface PricedPlan {
  priceToman: number;
  priceUsd: number | null;
  useUsdRate: boolean;
}

export function resolvePlanPriceToman(
  plan: PricedPlan,
  usdToTomanRate: number
): number {
  if (plan.useUsdRate && plan.priceUsd && plan.priceUsd > 0) {
    return Math.round((plan.priceUsd * usdToTomanRate) / 1000) * 1000;
  }
  return plan.priceToman;
}

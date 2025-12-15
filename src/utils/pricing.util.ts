export function calculatePrice(
  distanceInKm: number,
  basePrice,
  baseDistance,
  incrementPrice,
): number {
  if (distanceInKm <= baseDistance) return basePrice;

  const extraKm = distanceInKm - baseDistance;
  const extraCharge = extraKm * incrementPrice;

  return basePrice + extraCharge;
}

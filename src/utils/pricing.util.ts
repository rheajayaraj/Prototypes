export function calculatePrice(distanceInKm: number): number {
  const basePrice = 100; // or service-specific price
  if (distanceInKm <= 10) return basePrice;

  const extraKm = distanceInKm - 10;
  const extraCharge = extraKm * 5;

  return basePrice + extraCharge;
}

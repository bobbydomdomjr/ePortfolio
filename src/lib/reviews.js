export function nextReviewIndex(currentIndex, direction, reviewCount) {
  if (reviewCount < 2) return 0
  return (currentIndex + direction + reviewCount) % reviewCount
}

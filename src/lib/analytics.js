import { track } from '@vercel/analytics'

export function trackPortfolioEvent(name, data) {
  try {
    track(name, data)
  } catch (error) {
    console.warn('Portfolio analytics event could not be recorded:', error)
  }
}

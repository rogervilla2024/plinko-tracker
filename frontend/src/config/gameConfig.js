/**
 * Plinko Tracker - Game Configuration
 * Provider: BGaming
 */

export const GAME_CONFIG = {
  id: 'plinko',
  name: 'Plinko',
  slug: 'plinko',
  provider: 'BGaming',
  providerWebsite: 'https://bgaming.com',

  rtp: 99.0, // Highest RTP!
  houseEdge: 1.0,
  maxMultiplier: 1000,
  minBet: 0.10,
  maxBet: 100,

  // Plinko specific
  rowOptions: [8, 9, 10, 11, 12, 13, 14, 15, 16],
  riskLevels: ['low', 'medium', 'high'],

  domain: 'plinkotracker.com',
  trademark: 'Plinko™ game by BGaming.',
  description: 'Classic Plinko ball drop game with multiple risk levels.',

  theme: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accent: '#ef4444',
    gradient: 'from-amber-500 to-orange-500',
    darkBg: '#1c1917',
    cardBg: '#292524',
  },

  demoUrl: 'https://bgaming.com/games/plinko',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  gameId: 'plinko',

  features: ['riskLevels', 'provablyFair', 'autoPlay', 'rowSelection'],

  emails: {
    contact: 'contact@plinkotracker.com',
    legal: 'legal@plinkotracker.com',
  },

  seo: {
    title: 'Plinko Tracker - Statistics & Probability Calculator',
    description: 'Plinko game statistics with 99% RTP. Calculate odds, track results, and understand probability.',
    keywords: ['plinko', 'plinko game', 'bgaming plinko', 'plinko statistics', 'plinko odds'],
  },
}

// Multiplier tables by risk and rows
export const PLINKO_PAYOUTS = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
}

export const CHART_COLORS = [
  '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca'
]

export default GAME_CONFIG

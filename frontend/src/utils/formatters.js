/**
 * Plinko Tracker - Utility Formatters
 */

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format a multiplier value
 * @param {number} value - The multiplier value
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted multiplier (e.g., "5.50x")
 */
export const formatMultiplier = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}x`
}

/**
 * Format percentage value
 * @param {number} value - The percentage value (0-100)
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}

/**
 * Format RTP value
 * @param {number} value - The RTP value
 * @returns {string} Formatted RTP string
 */
export const formatRTP = (value) => {
  return `${value.toFixed(2)}%`
}

/**
 * Format large numbers with abbreviations
 * @param {number} value - The number to format
 * @returns {string} Formatted number (e.g., "1.5K", "2.3M")
 */
export const formatCompactNumber = (value) => {
  if (value === null || value === undefined) return '-'

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Format number with thousand separators
 * @param {number} value - The number to format
 * @returns {string} Formatted number with commas
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format date for display
 * @param {Date|string|number} date - The date to format
 * @param {string} format - Format style ('short', 'medium', 'long')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  const d = new Date(date)

  const options = {
    short: { month: 'numeric', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  }

  return d.toLocaleDateString('en-US', options[format])
}

/**
 * Format time for display
 * @param {Date|string|number} date - The date/time to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 minutes ago")
 * @param {Date|string|number} date - The date to compare
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(date, 'short')
}

/**
 * Get color class based on multiplier value for Plinko
 * @param {number} multiplier - The multiplier value
 * @param {string} risk - Risk level ('low', 'medium', 'high')
 * @returns {string} Tailwind color class
 */
export const getMultiplierColor = (multiplier, risk = 'medium') => {
  if (multiplier >= 100) return 'text-green-400'
  if (multiplier >= 10) return 'text-emerald-400'
  if (multiplier >= 2) return 'text-amber-400'
  if (multiplier >= 1) return 'text-yellow-400'
  return 'text-red-400'
}

/**
 * Get background color class for slot based on multiplier
 * @param {number} multiplier - The multiplier value
 * @param {number} maxMultiplier - Maximum multiplier for the row
 * @returns {string} Tailwind background class
 */
export const getSlotColorClass = (multiplier, maxMultiplier) => {
  const ratio = multiplier / maxMultiplier

  if (ratio >= 0.8) return 'bg-gradient-to-b from-green-500/80 to-green-600'
  if (ratio >= 0.5) return 'bg-gradient-to-b from-emerald-500/80 to-emerald-600'
  if (ratio >= 0.2) return 'bg-gradient-to-b from-amber-500/80 to-amber-600'
  if (ratio >= 0.1) return 'bg-gradient-to-b from-orange-500/80 to-orange-600'
  return 'bg-gradient-to-b from-red-500/80 to-red-600'
}

/**
 * Calculate probability for a specific slot in Plinko
 * Uses binomial distribution
 * @param {number} rows - Number of rows
 * @param {number} slotIndex - Target slot index (0 to rows)
 * @returns {number} Probability (0-1)
 */
export const calculateSlotProbability = (rows, slotIndex) => {
  // Binomial coefficient: C(n,k) = n! / (k! * (n-k)!)
  const factorial = (n) => {
    if (n <= 1) return 1
    let result = 1
    for (let i = 2; i <= n; i++) result *= i
    return result
  }

  const binomialCoeff = factorial(rows) / (factorial(slotIndex) * factorial(rows - slotIndex))
  const probability = binomialCoeff * Math.pow(0.5, rows)

  return probability
}

/**
 * Format probability as percentage
 * @param {number} probability - Probability value (0-1)
 * @returns {string} Formatted percentage
 */
export const formatProbability = (probability) => {
  const percent = probability * 100
  if (percent < 0.01) return '< 0.01%'
  if (percent < 1) return `${percent.toFixed(2)}%`
  return `${percent.toFixed(1)}%`
}

/**
 * Get risk level display info
 * @param {string} risk - Risk level ('low', 'medium', 'high')
 * @returns {object} Display info including color and label
 */
export const getRiskLevelInfo = (risk) => {
  const levels = {
    low: {
      label: 'Low Risk',
      color: 'green',
      colorClass: 'text-green-400',
      bgClass: 'bg-green-500/10',
      borderClass: 'border-green-500/30',
      description: 'Lower variance, more consistent returns',
      multiplierRange: '0.5x - 16x',
    },
    medium: {
      label: 'Medium Risk',
      color: 'amber',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30',
      description: 'Balanced risk and reward',
      multiplierRange: '0.3x - 110x',
    },
    high: {
      label: 'High Risk',
      color: 'red',
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/30',
      description: 'Higher variance, bigger potential wins',
      multiplierRange: '0.2x - 1000x',
    },
  }

  return levels[risk] || levels.medium
}

export default {
  formatCurrency,
  formatMultiplier,
  formatPercentage,
  formatRTP,
  formatCompactNumber,
  formatNumber,
  formatDate,
  formatTime,
  formatRelativeTime,
  getMultiplierColor,
  getSlotColorClass,
  calculateSlotProbability,
  formatProbability,
  getRiskLevelInfo,
}

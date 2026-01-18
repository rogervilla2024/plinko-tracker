/**
 * Plinko Specific Statistics Component
 *
 * Specialized visualizations for Plinko:
 * - Slot distribution
 * - Risk level comparison
 * - Theoretical vs actual analysis
 * - Jackpot tracker
 */

import React, { useState, useEffect, useMemo } from 'react'
import GAME_CONFIG from '../config/gameConfig'

// =============================================================================
// Utility Functions
// =============================================================================

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '-'
  return Number(num).toFixed(decimals)
}

const formatPercent = (num) => {
  if (num === null || num === undefined) return '-'
  return `${Number(num).toFixed(2)}%`
}

const timeAgo = (date) => {
  if (!date) return 'Never'
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// =============================================================================
// Slot Distribution Chart Component
// =============================================================================

export const SlotDistributionChart = ({ data, className = '' }) => {
  if (!data || !data.slots?.length) return null

  const maxPercentage = Math.max(...data.slots.map(s => s.percentage), 1)

  const getSlotColor = (slot) => {
    const mult = slot.multiplier
    if (mult >= 100) return 'bg-purple-500'
    if (mult >= 10) return 'bg-yellow-500'
    if (mult >= 2) return 'bg-green-500'
    if (mult >= 1) return 'bg-blue-500'
    return 'bg-red-500'
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>📊</span>
        Slot Distribution ({data.risk_level})
      </h3>

      {/* Vertical Bar Chart */}
      <div className="flex items-end justify-between gap-1 h-48 mb-4">
        {data.slots.map((slot) => {
          const height = (slot.percentage / maxPercentage) * 100

          return (
            <div
              key={slot.slot_id}
              className="flex-1 flex flex-col items-center"
              title={`Slot ${slot.slot_id}: ${formatPercent(slot.percentage)} (${slot.multiplier}x)`}
            >
              <div
                className={`w-full rounded-t transition-all ${getSlotColor(slot)}`}
                style={{ height: `${height}%`, minHeight: slot.hit_count > 0 ? '4px' : '0' }}
              />
              <span className="text-xs mt-1 text-slate-400">{slot.multiplier}x</span>
            </div>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-2 bg-slate-700/50 rounded">
          <p className="text-sm font-bold text-blue-400">{data.most_hit_slot}</p>
          <p className="text-xs text-slate-400">Most Hit</p>
        </div>
        <div className="text-center p-2 bg-slate-700/50 rounded">
          <p className="text-sm font-bold text-green-400">{formatNumber(data.avg_multiplier)}x</p>
          <p className="text-xs text-slate-400">Avg Multi</p>
        </div>
        <div className="text-center p-2 bg-slate-700/50 rounded">
          <p className="text-sm font-bold text-purple-400">{formatPercent(data.jackpot_rate)}</p>
          <p className="text-xs text-slate-400">Jackpot Rate</p>
        </div>
      </div>

      {/* Edge vs Center */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-blue-500/10 rounded">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Edge Slots</span>
            <span className="font-mono text-blue-400">{formatPercent(data.edge_rate)}</span>
          </div>
        </div>
        <div className="p-3 bg-green-500/10 rounded">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Center Slots</span>
            <span className="font-mono text-green-400">{formatPercent(data.center_rate)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Based on {data.total_drops?.toLocaleString()} drops.
      </p>
    </div>
  )
}

// =============================================================================
// Risk Level Comparison Component
// =============================================================================

export const PlinkoRiskComparison = ({ data, className = '' }) => {
  if (!data || !data.length) return null

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low': return 'border-green-500 bg-green-500/10'
      case 'medium': return 'border-yellow-500 bg-yellow-500/10'
      case 'high': return 'border-red-500 bg-red-500/10'
      default: return 'border-slate-500 bg-slate-500/10'
    }
  }

  const getRiskTextColor = (level) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>⚖️</span>
        Risk Level Comparison
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {data.map((risk) => (
          <div
            key={risk.risk_level}
            className={`p-4 rounded-lg border ${getRiskColor(risk.risk_level)}`}
          >
            <h4 className={`font-bold text-center uppercase mb-3 ${getRiskTextColor(risk.risk_level)}`}>
              {risk.risk_level}
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Multi</span>
                <span className="font-mono">{formatNumber(risk.avg_multiplier)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Std Dev</span>
                <span className="font-mono">{formatNumber(risk.std_deviation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RTP</span>
                <span className="font-mono">{formatPercent(risk.rtp_actual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Multi</span>
                <span className="font-mono">{risk.max_multiplier}x</span>
              </div>
            </div>

            {/* Win Distribution */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-400">Loss (&lt;1x)</span>
                  <span className="font-mono">{formatPercent(risk.loss_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">1-2x</span>
                  <span className="font-mono">{formatPercent(risk.small_win_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">2-10x</span>
                  <span className="font-mono">{formatPercent(risk.medium_win_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">10x+</span>
                  <span className="font-mono">{formatPercent(risk.big_win_rate)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Higher risk = higher volatility = bigger potential wins but also bigger losses.
      </p>
    </div>
  )
}

// =============================================================================
// Theoretical vs Actual Component
// =============================================================================

export const FairnessAnalysis = ({ data, className = '' }) => {
  if (!data) return null

  const getDeviationColor = (dev) => {
    const abs = Math.abs(dev)
    if (abs <= 1) return 'text-green-400'
    if (abs <= 3) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🎲</span>
        Fairness Analysis ({data.risk_level})
      </h3>

      {/* Fairness Score */}
      <div className={`p-4 rounded-lg mb-4 border ${
        data.is_fair ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">
              {data.is_fair ? '✅ Fair' : '⚠️ Investigate'}
            </p>
            <p className="text-sm text-slate-400">Chi-Square Test</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl">{formatNumber(data.chi_square_score, 2)}</p>
            <p className="text-xs text-slate-400">Score (lower is better)</p>
          </div>
        </div>
      </div>

      {/* Deviation Score */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-400">Overall Deviation</span>
          <span className={`font-mono ${data.deviation_score <= 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
            {formatNumber(data.deviation_score, 4)}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded overflow-hidden">
          <div
            className={`h-full ${data.deviation_score <= 0.3 ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${Math.min(data.deviation_score * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Per-Slot Deviations */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {data.slot_comparisons?.map((slot) => (
          <div key={slot.slot} className="flex items-center gap-2 text-xs">
            <span className="w-8 text-slate-400">S{slot.slot}</span>
            <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
              <div
                className={`h-full ${slot.deviation > 0 ? 'bg-blue-500' : 'bg-orange-500'}`}
                style={{
                  width: `${Math.min(Math.abs(slot.deviation) * 10, 100)}%`,
                  marginLeft: slot.deviation < 0 ? 'auto' : 0
                }}
              />
            </div>
            <span className={`w-12 text-right font-mono ${getDeviationColor(slot.deviation)}`}>
              {slot.deviation > 0 ? '+' : ''}{formatNumber(slot.deviation, 1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Over/Under Performing */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-2 bg-blue-500/10 rounded">
          <p className="text-xs text-slate-400 mb-1">Overperforming</p>
          <p className="text-sm font-mono">
            Slots: {data.overperforming_slots?.join(', ') || 'None'}
          </p>
        </div>
        <div className="p-2 bg-orange-500/10 rounded">
          <p className="text-xs text-slate-400 mb-1">Underperforming</p>
          <p className="text-sm font-mono">
            Slots: {data.underperforming_slots?.join(', ') || 'None'}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Compares actual slot distribution to theoretical binomial distribution.
        Small deviations are normal and expected.
      </p>
    </div>
  )
}

// =============================================================================
// Jackpot Tracker Component
// =============================================================================

export const PlinkoJackpotTracker = ({ data, className = '' }) => {
  if (!data) return null

  const isDrought = data.current_drought

  return (
    <div className={`bg-slate-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>💎</span>
        Jackpot Tracker (110x)
      </h3>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-4 bg-gradient-to-br from-purple-900/50 to-slate-800 rounded-lg border border-purple-500/30">
          <p className="text-3xl font-bold text-purple-400">{data.total_jackpots}</p>
          <p className="text-sm text-slate-400">Total Jackpots</p>
        </div>
        <div className={`text-center p-4 rounded-lg border ${
          isDrought ? 'bg-red-900/30 border-red-500/30' : 'bg-green-900/30 border-green-500/30'
        }`}>
          <p className={`text-3xl font-bold ${isDrought ? 'text-red-400' : 'text-green-400'}`}>
            {data.drops_since_jackpot}
          </p>
          <p className="text-sm text-slate-400">Drops Since</p>
        </div>
      </div>

      {/* Last Jackpot */}
      {data.last_jackpot_time && (
        <div className="p-3 bg-slate-700/50 rounded mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Last Jackpot</span>
            <span className="text-sm">{timeAgo(data.last_jackpot_time)}</span>
          </div>
        </div>
      )}

      {/* Average Between */}
      {data.average_drops_between && (
        <div className="p-3 bg-slate-700/50 rounded mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Avg Between Jackpots</span>
            <span className="font-mono text-blue-400">~{Math.round(data.average_drops_between)} drops</span>
          </div>
        </div>
      )}

      {/* Drought Alert */}
      {isDrought && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded mb-4">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <span>⚠️</span>
            Longer than average drought - but each drop is independent!
          </p>
        </div>
      )}

      {/* Probability */}
      <div className="text-center p-2 bg-slate-700/30 rounded">
        <p className="text-sm text-slate-400">
          Jackpot Probability: <span className="font-mono text-purple-400">{formatPercent(data.jackpot_probability)}</span>
        </p>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Jackpot = landing on 110x slot (High Risk only). Past droughts don't increase future probability.
      </p>
    </div>
  )
}

// =============================================================================
// Main Plinko Stats Page Component
// =============================================================================

export const PlinkoStatsPage = ({ className = '' }) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('24h')
  const [selectedRisk, setSelectedRisk] = useState('high')

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const apiUrl = GAME_CONFIG?.apiBaseUrl || GAME_CONFIG?.apiUrl || 'http://localhost:8000'

        const response = await fetch(`${apiUrl}/api/v2/plinko?period=${period}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        setStats(data)
      } catch (e) {
        console.error('Failed to fetch Plinko stats:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60 * 1000)
    return () => clearInterval(interval)
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
        Failed to load statistics: {error}
      </div>
    )
  }

  const currentDistribution = stats?.slot_distributions?.[selectedRisk]
  const currentFairness = stats?.fairness_analysis?.[selectedRisk]

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-bold">Plinko Analytics</h2>

        <div className="flex flex-wrap gap-4">
          {/* Risk Selector */}
          <div className="flex gap-1">
            {['low', 'medium', 'high'].map((risk) => (
              <button
                key={risk}
                onClick={() => setSelectedRisk(risk)}
                className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors ${
                  selectedRisk === risk
                    ? risk === 'low' ? 'bg-green-500 text-white' :
                      risk === 'medium' ? 'bg-yellow-500 text-black' :
                      'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {risk}
              </button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="flex gap-1">
            {['1h', '6h', '24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-800 rounded-lg">
          <p className="text-2xl font-bold text-blue-400">{stats?.total_drops?.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Total Drops</p>
        </div>
        <div className="text-center p-4 bg-slate-800 rounded-lg">
          <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.overall_avg_multiplier)}x</p>
          <p className="text-xs text-slate-400">Avg Multiplier</p>
        </div>
        <div className="text-center p-4 bg-slate-800 rounded-lg">
          <p className="text-2xl font-bold text-purple-400">{formatPercent(stats?.overall_rtp)}</p>
          <p className="text-xs text-slate-400">Overall RTP</p>
        </div>
        <div className="text-center p-4 bg-slate-800 rounded-lg">
          <p className="text-2xl font-bold text-yellow-400">{stats?.jackpot_tracker?.total_jackpots || 0}</p>
          <p className="text-xs text-slate-400">Jackpots</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SlotDistributionChart data={currentDistribution} />
        <PlinkoJackpotTracker data={stats?.jackpot_tracker} />
        <PlinkoRiskComparison data={stats?.risk_comparisons} className="lg:col-span-2" />
        <FairnessAnalysis data={currentFairness} className="lg:col-span-2" />
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <strong className="text-yellow-400">Disclaimer:</strong> Plinko uses physics-based
          ball drops with provably fair RNG. Slot distributions follow binomial probability.
          Past results do not predict future outcomes. Gamble responsibly.
        </p>
      </div>
    </div>
  )
}

export default PlinkoStatsPage

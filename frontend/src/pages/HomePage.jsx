import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import {
  Circle,
  TrendingUp,
  Target,
  Percent,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Zap,
  Award,
  Info
} from 'lucide-react'
import { GAME_CONFIG, PLINKO_PAYOUTS } from '../config/gameConfig'
import PlinkoBoard from '../components/PlinkoBoard'
import RiskSelector, { RowSelector, PlinkoControls } from '../components/RiskSelector'
import { formatMultiplier, formatPercentage, getRiskLevelInfo, calculateSlotProbability, formatProbability } from '../utils/formatters'

const HomePage = () => {
  const [risk, setRisk] = useState('medium')
  const [rows, setRows] = useState(12)
  const [dropHistory, setDropHistory] = useState([])
  const [stats, setStats] = useState({
    totalDrops: 0,
    totalWins: 0,
    biggestWin: 0,
    averageMultiplier: 0,
  })

  // Handle drop result
  const handleDrop = (result) => {
    const newHistory = [result, ...dropHistory].slice(0, 50)
    setDropHistory(newHistory)

    // Update stats
    const totalDrops = stats.totalDrops + 1
    const totalWins = stats.totalWins + (result.multiplier >= 1 ? 1 : 0)
    const biggestWin = Math.max(stats.biggestWin, result.multiplier)
    const allMultipliers = [result.multiplier, ...dropHistory.map(d => d.multiplier)]
    const averageMultiplier = allMultipliers.reduce((a, b) => a + b, 0) / allMultipliers.length

    setStats({
      totalDrops,
      totalWins,
      biggestWin,
      averageMultiplier,
    })
  }

  // Get current payouts
  const currentPayouts = PLINKO_PAYOUTS[risk]?.[12] || []
  const maxMultiplier = Math.max(...currentPayouts)
  const minMultiplier = Math.min(...currentPayouts)

  return (
    <>
      <Helmet>
        <title>Plinko Tracker - Live Statistics & Probability Calculator | 99% RTP</title>
        <meta
          name="description"
          content="Track Plinko game statistics with the industry's highest RTP at 99%. Calculate odds, simulate drops, and understand probability distributions."
        />
      </Helmet>

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-12 lg:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                  <Circle className="w-4 h-4 text-amber-400" fill="currentColor" />
                  <span className="text-sm text-amber-400 font-medium">BGaming Plinko</span>
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">99% RTP</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="text-gradient">Plinko Tracker</span>
                </h1>
                <p className="text-lg text-stone-400 max-w-2xl mx-auto">
                  Track statistics, calculate probabilities, and simulate drops for the classic
                  Plinko ball drop game with the <strong className="text-amber-400">highest RTP in online gaming</strong>.
                </p>
              </motion.div>
            </div>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
            >
              <div className="card text-center">
                <div className="stat-value">99%</div>
                <div className="stat-label">RTP</div>
              </div>
              <div className="card text-center">
                <div className="stat-value">1,000x</div>
                <div className="stat-label">Max Win</div>
              </div>
              <div className="card text-center">
                <div className="stat-value">3</div>
                <div className="stat-label">Risk Levels</div>
              </div>
              <div className="card text-center">
                <div className="stat-value">8-16</div>
                <div className="stat-label">Row Options</div>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Plinko Board */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-2"
              >
                <div className="card-amber">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-stone-100">Plinko Simulator</h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelInfo(risk).bgClass} ${getRiskLevelInfo(risk).colorClass}`}>
                        {getRiskLevelInfo(risk).label}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-stone-700 text-stone-300">
                        {rows} Rows
                      </span>
                    </div>
                  </div>

                  <PlinkoBoard
                    rows={rows}
                    risk={risk}
                    onDrop={handleDrop}
                    showProbability={true}
                  />
                </div>
              </motion.div>

              {/* Controls & Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="space-y-6"
              >
                {/* Game Controls */}
                <PlinkoControls
                  risk={risk}
                  onRiskChange={setRisk}
                  rows={rows}
                  onRowsChange={setRows}
                  rowOptions={[8, 10, 12, 14, 16]}
                />

                {/* Session Stats */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-stone-200 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-500" />
                    Session Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-stone-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-400">{stats.totalDrops}</p>
                      <p className="text-xs text-stone-500">Total Drops</p>
                    </div>
                    <div className="text-center p-3 bg-stone-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">{formatMultiplier(stats.biggestWin)}</p>
                      <p className="text-xs text-stone-500">Biggest Win</p>
                    </div>
                    <div className="text-center p-3 bg-stone-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-400">
                        {stats.totalDrops > 0 ? formatPercentage((stats.totalWins / stats.totalDrops) * 100) : '0%'}
                      </p>
                      <p className="text-xs text-stone-500">Win Rate</p>
                    </div>
                    <div className="text-center p-3 bg-stone-800/50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-400">{formatMultiplier(stats.averageMultiplier)}</p>
                      <p className="text-xs text-stone-500">Avg Multiplier</p>
                    </div>
                  </div>
                </div>

                {/* Drop History */}
                {dropHistory.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-stone-200 mb-4">Recent Drops</h3>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {dropHistory.slice(0, 20).map((drop, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            drop.multiplier >= 10 ? 'bg-green-500/20 text-green-400' :
                            drop.multiplier >= 2 ? 'bg-amber-500/20 text-amber-400' :
                            drop.multiplier >= 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {formatMultiplier(drop.multiplier)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="py-12 bg-stone-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              {/* What is Plinko */}
              <div className="card">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Circle className="w-6 h-6 text-amber-400" fill="currentColor" />
                </div>
                <h3 className="text-lg font-bold text-stone-100 mb-2">What is Plinko?</h3>
                <p className="text-sm text-stone-400">
                  Plinko is a classic ball drop game inspired by The Price is Right TV show.
                  Drop a ball from the top and watch it bounce through pegs to land in multiplier slots.
                </p>
              </div>

              {/* Risk Levels */}
              <div className="card">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-stone-100 mb-2">Risk Levels</h3>
                <p className="text-sm text-stone-400">
                  Choose between Low, Medium, and High risk. Higher risk means more volatile outcomes
                  with potential for bigger wins up to 1,000x but also more frequent losses.
                </p>
              </div>

              {/* 99% RTP */}
              <div className="card">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Percent className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-stone-100 mb-2">99% RTP</h3>
                <p className="text-sm text-stone-400">
                  BGaming Plinko offers one of the highest RTPs in online gaming at 99%.
                  This means only 1% house edge - much better than most casino games!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Payout Table Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-stone-100 mb-6 text-center">
              Plinko Payout Tables
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {['low', 'medium', 'high'].map((riskLevel) => {
                const info = getRiskLevelInfo(riskLevel)
                const payouts = PLINKO_PAYOUTS[riskLevel]?.[12] || []

                return (
                  <div key={riskLevel} className={`card ${info.borderClass} border-2`}>
                    <h3 className={`text-lg font-bold ${info.colorClass} mb-4`}>
                      {info.label} (12 Rows)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {payouts.map((payout, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            payout >= 10 ? 'bg-green-500/20 text-green-400' :
                            payout >= 2 ? 'bg-amber-500/20 text-amber-400' :
                            payout >= 1 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {payout}x
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-stone-500 mt-4">
                      Range: {Math.min(...payouts)}x - {Math.max(...payouts)}x
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Responsible Gambling Warning */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-400 mb-2">Responsible Gambling Notice</h3>
                  <p className="text-sm text-stone-300">
                    This simulator is for educational purposes only. Real gambling involves real money and real risks.
                    Past simulation results do not predict future outcomes. Each drop is independent and random.
                    If you choose to gamble, please do so responsibly and within your means.
                    If you have a gambling problem, seek help at{' '}
                    <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                      BeGambleAware.org
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default HomePage

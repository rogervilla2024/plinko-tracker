import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLINKO_PAYOUTS } from '../config/gameConfig'
import { formatMultiplier, getSlotColorClass, calculateSlotProbability, formatProbability } from '../utils/formatters'

/**
 * PlinkoBoard Component
 * Visual representation of a Plinko board with animated ball drops
 */
const PlinkoBoard = ({
  rows = 12,
  risk = 'medium',
  showProbability = true,
  onDrop = null,
  autoPlay = false,
  className = '',
}) => {
  const [balls, setBalls] = useState([])
  const [lastResult, setLastResult] = useState(null)
  const [highlightedPegs, setHighlightedPegs] = useState([])

  // Get payouts for current settings
  const payouts = useMemo(() => {
    // Find closest available row count
    const availableRows = Object.keys(PLINKO_PAYOUTS[risk]).map(Number)
    const closestRow = availableRows.reduce((prev, curr) =>
      Math.abs(curr - rows) < Math.abs(prev - rows) ? curr : prev
    )
    return PLINKO_PAYOUTS[risk][closestRow] || []
  }, [risk, rows])

  // Calculate max multiplier for color scaling
  const maxMultiplier = useMemo(() => Math.max(...payouts), [payouts])

  // Generate peg positions
  const pegs = useMemo(() => {
    const pegArray = []
    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 2
      for (let col = 0; col < pegsInRow; col++) {
        pegArray.push({
          id: `${row}-${col}`,
          row,
          col,
          x: 50 + (col - (pegsInRow - 1) / 2) * (70 / rows),
          y: 10 + (row * 80) / rows,
        })
      }
    }
    return pegArray
  }, [rows])

  // Simulate ball drop
  const simulateDrop = useCallback(() => {
    let position = 0
    const path = []

    // For each row, ball goes left or right (50/50)
    for (let i = 0; i < rows; i++) {
      const goRight = Math.random() > 0.5
      if (goRight) position++
      path.push({ row: i, position, direction: goRight ? 'right' : 'left' })
    }

    return { finalPosition: position, path }
  }, [rows])

  // Drop a ball
  const dropBall = useCallback(() => {
    const { finalPosition, path } = simulateDrop()
    const ballId = Date.now()
    const multiplier = payouts[finalPosition] || 1

    const newBall = {
      id: ballId,
      path,
      finalPosition,
      multiplier,
      startTime: Date.now(),
    }

    setBalls((prev) => [...prev, newBall])

    // Highlight pegs along path
    path.forEach((step, index) => {
      setTimeout(() => {
        setHighlightedPegs((prev) => [...prev, `${step.row}-${step.position}`])
      }, index * 100)
    })

    // Clear ball and pegs after animation
    setTimeout(() => {
      setBalls((prev) => prev.filter((b) => b.id !== ballId))
      setHighlightedPegs([])
      setLastResult({ position: finalPosition, multiplier })
      if (onDrop) onDrop({ position: finalPosition, multiplier })
    }, rows * 100 + 500)
  }, [simulateDrop, payouts, rows, onDrop])

  // Auto-play effect
  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(dropBall, 2000)
    return () => clearInterval(interval)
  }, [autoPlay, dropBall])

  return (
    <div className={`plinko-board p-4 ${className}`}>
      {/* SVG Board */}
      <svg viewBox="0 0 100 100" className="w-full aspect-square max-h-[500px]">
        {/* Background gradient */}
        <defs>
          <linearGradient id="boardGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1c1917" />
            <stop offset="100%" stopColor="#0c0a09" />
          </linearGradient>
          <radialGradient id="pegGradient">
            <stop offset="0%" stopColor="#a8a29e" />
            <stop offset="100%" stopColor="#57534e" />
          </radialGradient>
          <radialGradient id="pegHitGradient">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <radialGradient id="ballGradient">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="url(#boardGradient)" />

        {/* Pegs */}
        {pegs.map((peg) => (
          <circle
            key={peg.id}
            cx={peg.x}
            cy={peg.y}
            r={1.5}
            fill={highlightedPegs.includes(peg.id) ? 'url(#pegHitGradient)' : 'url(#pegGradient)'}
            className={highlightedPegs.includes(peg.id) ? 'animate-bounce-peg' : ''}
          />
        ))}

        {/* Ball drop zone indicator */}
        <line x1="50" y1="2" x2="50" y2="8" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1,1" />
        <circle cx="50" cy="4" r="1" fill="#f59e0b" opacity="0.5" />

        {/* Animated Balls */}
        <AnimatePresence>
          {balls.map((ball) => {
            const progress = Math.min((Date.now() - ball.startTime) / (rows * 100), 1)
            const currentStep = Math.floor(progress * ball.path.length)
            const step = ball.path[currentStep] || ball.path[ball.path.length - 1]

            const numSlots = rows + 1
            const slotWidth = 80 / numSlots
            const x = 10 + step.position * slotWidth + slotWidth / 2
            const y = 10 + (step.row * 80) / rows

            return (
              <motion.circle
                key={ball.id}
                cx={50}
                cy={4}
                r={2}
                fill="url(#ballGradient)"
                initial={{ cx: 50, cy: 4 }}
                animate={{ cx: x, cy: Math.min(y, 88) }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' }}
              />
            )
          })}
        </AnimatePresence>

        {/* Slots at bottom */}
        {payouts.map((multiplier, index) => {
          const numSlots = payouts.length
          const slotWidth = 80 / numSlots
          const x = 10 + index * slotWidth
          const isEdge = index === 0 || index === numSlots - 1
          const isCenter = index === Math.floor(numSlots / 2)

          return (
            <g key={index}>
              {/* Slot background */}
              <rect
                x={x}
                y={90}
                width={slotWidth}
                height={8}
                rx={1}
                className={
                  multiplier >= maxMultiplier * 0.8
                    ? 'fill-green-500/80'
                    : multiplier >= maxMultiplier * 0.3
                    ? 'fill-amber-500/80'
                    : multiplier >= 1
                    ? 'fill-orange-500/80'
                    : 'fill-red-500/80'
                }
              />
              {/* Multiplier text */}
              <text
                x={x + slotWidth / 2}
                y={95}
                textAnchor="middle"
                fontSize={numSlots > 13 ? '2' : '2.5'}
                fill="white"
                fontWeight="bold"
              >
                {multiplier}x
              </text>
            </g>
          )
        })}
      </svg>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Drop Button */}
        <button
          onClick={dropBall}
          disabled={balls.length > 0}
          className="btn-primary w-full py-3 text-lg disabled:opacity-50"
        >
          {balls.length > 0 ? 'Dropping...' : 'Drop Ball'}
        </button>

        {/* Last Result */}
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-3 rounded-lg bg-stone-800/50 border border-stone-700"
          >
            <p className="text-sm text-stone-400">Last Result</p>
            <p className={`text-2xl font-bold ${
              lastResult.multiplier >= 10 ? 'text-green-400' :
              lastResult.multiplier >= 2 ? 'text-amber-400' :
              lastResult.multiplier >= 1 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {formatMultiplier(lastResult.multiplier)}
            </p>
          </motion.div>
        )}

        {/* Probability Display */}
        {showProbability && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-stone-800/50">
              <p className="text-green-400 font-bold">{formatProbability(calculateSlotProbability(rows, 0))}</p>
              <p className="text-stone-500">Edge slots</p>
            </div>
            <div className="p-2 rounded bg-stone-800/50">
              <p className="text-amber-400 font-bold">{formatProbability(calculateSlotProbability(rows, Math.floor(rows / 2)))}</p>
              <p className="text-stone-500">Center</p>
            </div>
            <div className="p-2 rounded bg-stone-800/50">
              <p className="text-stone-400 font-bold">{rows + 1}</p>
              <p className="text-stone-500">Total slots</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlinkoBoard

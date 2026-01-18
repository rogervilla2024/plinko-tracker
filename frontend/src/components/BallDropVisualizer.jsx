import React, { useState, useRef, useEffect, useMemo } from 'react';

/**
 * Ball Drop Visualizer - Plinko Animated Simulation
 * Visual ball dropping through pegs with real physics simulation
 */
export function BallDropVisualizer({ rtp = 99 }) {
  const [rows, setRows] = useState(12);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [isDropping, setIsDropping] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [dropHistory, setDropHistory] = useState([]);
  const [stats, setStats] = useState({ drops: 0, profit: 0, totalWagered: 0 });
  const [betAmount, setBetAmount] = useState(1);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Multiplier slots based on risk and rows
  const getMultipliers = useMemo(() => {
    const configs = {
      low: {
        8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
        12: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
        16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
      },
      medium: {
        8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
        12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
        16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
      },
      high: {
        8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
        12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
        16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
      }
    };
    return configs[riskLevel][rows] || configs.medium[12];
  }, [riskLevel, rows]);

  // Calculate probabilities (binomial distribution)
  const probabilities = useMemo(() => {
    const probs = [];
    const n = rows;
    for (let k = 0; k <= n; k++) {
      let binom = 1;
      for (let i = 0; i < k; i++) {
        binom *= (n - i) / (i + 1);
      }
      probs.push(binom * Math.pow(0.5, n));
    }
    return probs;
  }, [rows]);

  // Simulate ball drop
  const dropBall = () => {
    if (isDropping) return;
    setIsDropping(true);

    // Track ball path
    let position = rows / 2; // Start at center
    const path = [];

    for (let i = 0; i < rows; i++) {
      const goRight = Math.random() > 0.5;
      position += goRight ? 0.5 : -0.5;
      path.push({ row: i, direction: goRight ? 'R' : 'L' });
    }

    const finalSlot = Math.round(position);
    const multiplier = getMultipliers[finalSlot] || 0.5;
    const winAmount = betAmount * multiplier;
    const profit = winAmount - betAmount;

    // Animate
    let frame = 0;
    const totalFrames = rows * 10;

    const animate = () => {
      frame++;
      const progress = frame / totalFrames;
      const currentRow = Math.floor(progress * rows);

      if (frame < totalFrames) {
        // Calculate current position based on path
        let x = 0;
        for (let i = 0; i <= Math.min(currentRow, path.length - 1); i++) {
          x += path[i].direction === 'R' ? 1 : -1;
        }

        setBallPosition({
          x: x / 2,
          y: currentRow / rows
        });

        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Drop complete
        setIsDropping(false);
        setDropHistory(prev => [{
          slot: finalSlot,
          multiplier,
          profit,
          path
        }, ...prev].slice(0, 50));

        setStats(prev => ({
          drops: prev.drops + 1,
          profit: prev.profit + profit,
          totalWagered: prev.totalWagered + betAmount
        }));

        setBallPosition({ x: 0, y: 0 });
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Auto drop multiple
  const autoDrop = (count) => {
    let dropped = 0;
    const interval = setInterval(() => {
      if (dropped >= count) {
        clearInterval(interval);
        return;
      }

      // Quick simulation without animation
      let position = rows / 2;
      for (let i = 0; i < rows; i++) {
        position += Math.random() > 0.5 ? 0.5 : -0.5;
      }

      const finalSlot = Math.round(position);
      const multiplier = getMultipliers[finalSlot] || 0.5;
      const profit = betAmount * multiplier - betAmount;

      setDropHistory(prev => [{
        slot: finalSlot,
        multiplier,
        profit,
        path: []
      }, ...prev].slice(0, 50));

      setStats(prev => ({
        drops: prev.drops + 1,
        profit: prev.profit + profit,
        totalWagered: prev.totalWagered + betAmount
      }));

      dropped++;
    }, 50);
  };

  // Reset
  const reset = () => {
    setDropHistory([]);
    setStats({ drops: 0, profit: 0, totalWagered: 0 });
  };

  // Get multiplier color
  const getMultColor = (mult) => {
    if (mult >= 100) return 'bg-purple-600 text-white';
    if (mult >= 10) return 'bg-pink-600 text-white';
    if (mult >= 2) return 'bg-green-600 text-white';
    if (mult >= 1) return 'bg-blue-600 text-white';
    return 'bg-red-600 text-white';
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎱</span>
        Ball Drop Visualizer
        <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded ml-2">PLINKO - 99% RTP!</span>
      </h3>

      {/* Best RTP Banner */}
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <h4 className="text-green-400 font-bold">HIGHEST RTP: 99%!</h4>
            <p className="text-gray-300 text-sm">
              Plinko has the best odds of any crash game. Only 1% house edge means
              $1 lost per $100 wagered on average.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-gray-400 text-xs mb-1">Rows</label>
          <select
            value={rows}
            onChange={(e) => setRows(parseInt(e.target.value))}
            disabled={isDropping}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value={8}>8 rows</option>
            <option value={12}>12 rows</option>
            <option value={16}>16 rows</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Risk</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            disabled={isDropping}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="low">Low (0.5x-16x)</option>
            <option value="medium">Medium (0.3x-110x)</option>
            <option value="high">High (0.2x-1000x)</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Bet ($)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 1)}
            disabled={isDropping}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-1">Slots</label>
          <div className="bg-gray-900 rounded px-3 py-2 text-amber-400 font-bold">
            {rows + 1} slots
          </div>
        </div>
      </div>

      {/* Plinko Board Visualization */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 relative overflow-hidden">
        {/* Pegs Grid */}
        <div className="flex flex-col items-center gap-2 py-4">
          {/* Ball indicator */}
          {isDropping && (
            <div
              className="absolute w-6 h-6 bg-yellow-400 rounded-full shadow-lg z-10 transition-all duration-100"
              style={{
                left: `calc(50% + ${ballPosition.x * 30}px - 12px)`,
                top: `${20 + ballPosition.y * 200}px`
              }}
            >
              🔵
            </div>
          )}

          {/* Peg rows */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-3">
              {Array.from({ length: rowIdx + 2 }).map((_, pegIdx) => (
                <div
                  key={pegIdx}
                  className="w-3 h-3 bg-gray-600 rounded-full"
                />
              ))}
            </div>
          ))}
        </div>

        {/* Multiplier Slots */}
        <div className="flex justify-center gap-1 mt-4">
          {getMultipliers.map((mult, idx) => {
            const prob = probabilities[idx] * 100;
            const recentHits = dropHistory.filter(d => d.slot === idx).length;

            return (
              <div
                key={idx}
                className={`flex-shrink-0 w-12 h-16 rounded-lg flex flex-col items-center justify-center ${getMultColor(mult)} ${
                  dropHistory[0]?.slot === idx ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                }`}
              >
                <div className="text-sm font-bold">{mult}x</div>
                <div className="text-xs opacity-75">{prob.toFixed(1)}%</div>
                {recentHits > 0 && (
                  <div className="absolute -top-2 -right-1 w-4 h-4 bg-yellow-400 rounded-full text-xs text-black font-bold flex items-center justify-center">
                    {recentHits}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={dropBall}
          disabled={isDropping}
          className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded-lg font-bold"
        >
          {isDropping ? 'Dropping...' : `DROP BALL ($${betAmount})`}
        </button>
        <button
          onClick={() => autoDrop(10)}
          disabled={isDropping}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
        >
          10x Quick
        </button>
        <button
          onClick={() => autoDrop(100)}
          disabled={isDropping}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium"
        >
          100x Quick
        </button>
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
        >
          Reset
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400">Total Drops</div>
          <div className="text-2xl font-bold text-white">{stats.drops}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400">Total Wagered</div>
          <div className="text-2xl font-bold text-blue-400">${stats.totalWagered.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400">Total Profit</div>
          <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-400">Actual RTP</div>
          <div className={`text-2xl font-bold ${
            stats.totalWagered > 0 && (stats.profit + stats.totalWagered) / stats.totalWagered * 100 >= 99
              ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {stats.totalWagered > 0
              ? ((stats.profit + stats.totalWagered) / stats.totalWagered * 100).toFixed(1)
              : 99}%
          </div>
        </div>
      </div>

      {/* Recent Drops */}
      {dropHistory.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-2">Recent Drops</h4>
          <div className="flex flex-wrap gap-2">
            {dropHistory.slice(0, 20).map((drop, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded-lg text-sm font-bold ${getMultColor(drop.multiplier)}`}
              >
                {drop.multiplier}x
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution Comparison */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-white font-medium mb-2">Why Plinko Has Best Odds</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-green-400">Plinko (BGaming)</span>
            <span className="text-green-400 font-bold">99% RTP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Aviator, JetX, etc.</span>
            <span className="text-gray-400">97% RTP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-400">Thundercrash</span>
            <span className="text-red-400">95% RTP</span>
          </div>
          <p className="text-gray-400 mt-2 text-xs">
            99% RTP means you lose only $1 per $100 on average, compared to $3 for most crash games.
            Over 1000 bets of $1, you'd expect to lose ~$10 at Plinko vs ~$30 at Aviator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BallDropVisualizer;

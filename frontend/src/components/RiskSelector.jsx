import { getRiskLevelInfo } from '../utils/formatters'

/**
 * RiskSelector Component
 * Allows users to select between Low, Medium, and High risk levels
 */
const RiskSelector = ({ selected, onChange, className = '' }) => {
  const riskLevels = ['low', 'medium', 'high']

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-sm font-medium text-stone-400">Risk Level</label>
      <div className="flex gap-2">
        {riskLevels.map((risk) => {
          const info = getRiskLevelInfo(risk)
          const isSelected = selected === risk

          return (
            <button
              key={risk}
              onClick={() => onChange(risk)}
              className={`
                risk-btn flex-1 flex flex-col items-center gap-1
                ${isSelected ? `risk-${risk} active` : `risk-${risk}`}
              `}
            >
              <span className="font-bold text-sm">{info.label.split(' ')[0]}</span>
              <span className="text-[10px] opacity-70">{info.multiplierRange}</span>
            </button>
          )
        })}
      </div>

      {/* Selected Risk Info */}
      <div className={`p-3 rounded-lg ${getRiskLevelInfo(selected).bgClass} ${getRiskLevelInfo(selected).borderClass} border`}>
        <p className={`text-sm ${getRiskLevelInfo(selected).colorClass}`}>
          {getRiskLevelInfo(selected).description}
        </p>
      </div>
    </div>
  )
}

/**
 * RowSelector Component
 * Allows users to select number of rows (8-16)
 */
export const RowSelector = ({ selected, onChange, options = [8, 10, 12, 14, 16], className = '' }) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <label className="text-sm font-medium text-stone-400">Number of Rows</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((rows) => {
          const isSelected = selected === rows

          return (
            <button
              key={rows}
              onClick={() => onChange(rows)}
              className={`
                px-4 py-2 rounded-lg font-semibold transition-all duration-200
                ${isSelected
                  ? 'bg-amber-500 text-stone-900'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }
              `}
            >
              {rows}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-stone-500">
        More rows = Higher variance and more slots
      </p>
    </div>
  )
}

/**
 * Combined Controls Component
 */
export const PlinkoControls = ({
  risk,
  onRiskChange,
  rows,
  onRowsChange,
  rowOptions = [8, 10, 12, 14, 16],
  className = ''
}) => {
  return (
    <div className={`card space-y-6 ${className}`}>
      <h3 className="text-lg font-semibold text-stone-200">Game Settings</h3>

      <RiskSelector
        selected={risk}
        onChange={onRiskChange}
      />

      <RowSelector
        selected={rows}
        onChange={onRowsChange}
        options={rowOptions}
      />

      {/* Stats Preview */}
      <div className="pt-4 border-t border-stone-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-amber-400">{rows + 1}</p>
            <p className="text-xs text-stone-500">Slots</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">99%</p>
            <p className="text-xs text-stone-500">RTP</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiskSelector

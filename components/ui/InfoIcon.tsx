import { Tooltip } from './Tooltip'

interface InfoIconProps {
  tooltip: string | React.ReactNode
  className?: string
}

export function InfoIcon({ tooltip, className = '' }: InfoIconProps) {
  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        className={`
          inline-flex items-center justify-center
          w-4 h-4 rounded-full
          text-gray-500 hover:text-gray-700 hover:bg-gray-100
          transition-colors cursor-help
          ${className}
        `}
        aria-label="More information"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Tooltip>
  )
}

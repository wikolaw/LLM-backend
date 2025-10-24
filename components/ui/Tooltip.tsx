'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  content: string | ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}

export function Tooltip({
  children,
  content,
  side = 'top',
  delayDuration = 300
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className="
              bg-gray-900 text-white text-sm px-3 py-2 rounded-lg
              max-w-xs shadow-xl border border-gray-700 z-50
              animate-in fade-in-0 zoom-in-95 duration-150
              data-[state=closed]:animate-out data-[state=closed]:fade-out-0
            "
            sideOffset={5}
          >
            <div className="leading-relaxed">{content}</div>
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

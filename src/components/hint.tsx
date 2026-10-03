import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface HintProps {
  label: string
  /** Atalho exibido ao lado do texto, ex.: "Ctrl+N". */
  shortcut?: string
  side?: React.ComponentProps<typeof TooltipContent>["side"]
  /** O filho precisa repassar ref e props (um <button> ou componente com asChild). */
  children: React.ReactElement
}

export function Hint({ label, shortcut, side = "bottom", children }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>
        {label}
        {shortcut && (
          <kbd data-slot="kbd" className="font-sans text-[11px] text-background/60">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

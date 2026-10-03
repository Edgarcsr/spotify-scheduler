import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { cn } from "@/lib/utils"

const appWindow = getCurrentWindow()

// Botões de legenda no estilo do Windows 11: encostados no canto superior direito
// (dá pra "jogar" o mouse no canto e acertar o fechar) e com glifos finos de 10px.
export function WindowControls({ className }: { className?: string }) {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    appWindow.isMaximized().then(setMaximized)
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized)
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return (
    <div className={cn("flex h-full shrink-0", className)}>
      <CaptionButton label="Minimizar" onClick={() => appWindow.minimize()}>
        <path d="M0 5.5h10" />
      </CaptionButton>
      <CaptionButton label={maximized ? "Restaurar" : "Maximizar"} onClick={() => appWindow.toggleMaximize()}>
        {maximized ? (
          <>
            <rect x="0.5" y="2.5" width="7" height="7" rx="1" />
            <path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" />
          </>
        ) : (
          <rect x="0.5" y="0.5" width="9" height="9" rx="1" />
        )}
      </CaptionButton>
      <CaptionButton
        label="Fechar para a bandeja"
        onClick={() => appWindow.close()}
        className="hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/90"
      >
        <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />
      </CaptionButton>
    </div>
  )
}

function CaptionButton({
  label,
  className,
  children,
  ...props
}: { label: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      tabIndex={-1}
      className={cn(
        "flex h-full w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground active:bg-foreground/[0.12]",
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
        {children}
      </svg>
    </button>
  )
}

import { useEffect, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react"

import { Hint } from "@/components/hint"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const appWindow = getCurrentWindow()

// Controles da janela como botões ghost do app, no mesmo tamanho dos outros botões de ícone
// do cabeçalho, em vez de imitar os botões de legenda do Windows.
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
    <div className={cn("flex shrink-0 items-center gap-0.5 pr-3", className)}>
      <CaptionButton label="Minimizar" onClick={() => appWindow.minimize()}>
        <MinusIcon />
      </CaptionButton>
      <CaptionButton label={maximized ? "Restaurar" : "Maximizar"} onClick={() => appWindow.toggleMaximize()}>
        {/* O "restaurar" do Windows são dois quadrados sobrepostos; o CopyIcon tem esse desenho. */}
        {maximized ? <CopyIcon className="size-3.5" /> : <SquareIcon className="size-3.5" />}
      </CaptionButton>
      <CaptionButton
        label="Fechar para a bandeja"
        onClick={() => appWindow.close()}
        className="hover:bg-destructive/15 hover:text-destructive dark:hover:bg-destructive/20"
      >
        <XIcon />
      </CaptionButton>
    </div>
  )
}

function CaptionButton({ label, className, ...props }: { label: string } & React.ComponentProps<typeof Button>) {
  return (
    <Hint label={label}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn("text-muted-foreground", className)}
        {...props}
      />
    </Hint>
  )
}

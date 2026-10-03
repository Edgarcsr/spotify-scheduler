import { useEffect, useState, useRef } from "react"
import { listen } from "@tauri-apps/api/event"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandPalette } from "@/components/command-palette"
import { LibraryView } from "@/components/library-view"
import { ScheduleDialog } from "@/components/schedule-dialog"
import { SpotifyConnectDialog } from "@/components/spotify-connect-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useNow } from "@/hooks/use-now"
import { useSchedules } from "@/hooks/use-schedules"
import { useSpotify } from "@/hooks/use-spotify"
import { api, errorMessage, type ScheduleFiredEvent } from "@/lib/api"
import type { Schedule, SpotifyItem } from "@/lib/types"

function App() {
  const { schedules, save, remove, toggle, duplicate } = useSchedules()
  const spotify = useSpotify()
  const now = useNow()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [prefill, setPrefill] = useState<SpotifyItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [commandsOpen, setCommandsOpen] = useState(false)
  const [query, setQuery] = useState("")

  // Disparos do agendador em background.
  useEffect(() => {
    const unlisten = listen<ScheduleFiredEvent>("schedule-fired", ({ payload }) => {
      if (payload.ok) toast.success(payload.name, { description: payload.message })
      else toast.error(`${payload.name} falhou`, { description: payload.message })
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  // Atalhos de teclado: Ctrl+N novo, Ctrl+K comandos.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault()
        openNew()
      }
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault()
        setCommandsOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Sem o menu nativo do WebView (Recarregar, Inspecionar…) fora de campos de texto:
  // num app de desktop ele denuncia o navegador. Em dev fica, pro Inspecionar.
  useEffect(() => {
    if (import.meta.env.DEV) return
    function onContextMenu(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable=true]")) return
      e.preventDefault()
    }
    document.addEventListener("contextmenu", onContextMenu)
    return () => document.removeEventListener("contextmenu", onContextMenu)
  }, [])

  function searchSpotify(text: string) {
    setQuery(text)
    document.getElementById("library-search")?.focus()
  }

  function openNew(item: SpotifyItem | null = null) {
    setEditing(null)
    setPrefill(item)
    setDialogOpen(true)
  }

  function openEdit(schedule: Schedule) {
    setEditing(schedule)
    setPrefill(null)
    setDialogOpen(true)
  }

  function handleSave(schedule: Schedule) {
    const isNew = !schedules.some((s) => s.id === schedule.id)
    save(schedule)
    toast.success(isNew ? "Agendamento criado" : "Agendamento salvo", {
      description: `${schedule.name} às ${schedule.time}`,
    })
  }

  function addTo(schedule: Schedule, item: SpotifyItem) {
    // "Tocar" só tem um item, então trocar é o equivalente a adicionar.
    if (schedule.mode === "play") {
      save({ ...schedule, items: [item] })
      toast.success(`${schedule.name} vai tocar ${item.name}`)
    } else {
      save({ ...schedule, items: [...schedule.items, item] })
      toast.success(`${item.name} adicionado a ${schedule.name}`)
    }
  }

  function runNow(schedule: Schedule) {
    toast.promise(api.runScheduleNow(schedule), {
      loading: `Executando "${schedule.name}"…`,
      success: (message) => message,
      error: (e) => errorMessage(e),
    })
  }

  const lastDeleted = useRef<Schedule | null>(null)

  function confirmDelete() {
    if (!pendingDelete) return
    lastDeleted.current = pendingDelete
    remove(pendingDelete.id)
    setPendingDelete(null)
    toast(`"${pendingDelete.name}" excluído`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          if (lastDeleted.current) {
            save(lastDeleted.current)
            lastDeleted.current = null
          }
        },
      },
      duration: 5000,
    })
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem", "--sidebar-width-icon": "4.5rem" } as React.CSSProperties}>
      <AppSidebar
        schedules={schedules}
        now={now}
        spotify={spotify.status}
        onOpenAccount={() => setConnectOpen(true)}
        onNew={() => openNew()}
        onEdit={openEdit}
        onToggle={(schedule, enabled) => toggle(schedule.id, enabled)}
        onDuplicate={(schedule) => duplicate(schedule.id)}
        onRunNow={runNow}
        onDelete={setPendingDelete}
      />

      <SidebarInset>
        <LibraryView
          connected={spotify.status ? spotify.connected : null}
          schedules={schedules}
          onConnect={() => setConnectOpen(true)}
          onSchedule={openNew}
          onAddTo={addTo}
          query={query}
          onQueryChange={setQuery}
          onOpenCommands={() => setCommandsOpen(true)}
        />
      </SidebarInset>

      <CommandPalette
        open={commandsOpen}
        onOpenChange={setCommandsOpen}
        schedules={schedules}
        now={now}
        spotifyConnected={!!spotify.status?.user}
        onOpenAccount={() => setConnectOpen(true)}
        onSearchSpotify={searchSpotify}
        onNew={() => openNew()}
        onEdit={openEdit}
        onToggle={(schedule, enabled) => toggle(schedule.id, enabled)}
        onDuplicate={(schedule) => duplicate(schedule.id)}
        onRunNow={runNow}
        onDelete={setPendingDelete}
      />

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editing}
        prefill={prefill}
        onSave={handleSave}
      />

      <SpotifyConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        status={spotify.status}
        onLogin={spotify.login}
        onLogout={spotify.logout}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" vai parar de disparar. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  )
}

export default App

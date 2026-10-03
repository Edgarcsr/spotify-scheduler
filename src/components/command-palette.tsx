import { useState } from "react"
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  CopyIcon,
  MoonIcon,
  PanelLeftIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  SearchIcon,
  SunIcon,
  Trash2Icon,
  UserIcon,
  ZapIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import type { ScheduleActions } from "@/components/app-sidebar"
import { ItemArtwork } from "@/components/item-artwork"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useSidebar } from "@/components/ui/sidebar"
import { formatDays, nextOccurrence } from "@/lib/schedule"
import type { Schedule } from "@/lib/types"

interface CommandPaletteProps extends ScheduleActions {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedules: Schedule[]
  now: Date
  spotifyConnected: boolean
  onOpenAccount: () => void
  onSearchSpotify: (query: string) => void
}

/**
 * Ctrl+K. Duas páginas: a raiz (agendamentos + ações do app) e, ao escolher um
 * agendamento, as ações dele. Backspace com a busca vazia volta pra raiz.
 */
export function CommandPalette({
  open,
  onOpenChange,
  schedules,
  now,
  spotifyConnected,
  onOpenAccount,
  onSearchSpotify,
  ...actions
}: CommandPaletteProps) {
  const [search, setSearch] = useState("")
  const [pageId, setPageId] = useState<string | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const { toggleSidebar, state: sidebarState } = useSidebar()

  const page = schedules.find((s) => s.id === pageId) ?? null
  const ordered = [...schedules].sort(
    (a, b) =>
      Number(b.enabled) - Number(a.enabled) ||
      (nextOccurrence(a, now)?.getTime() ?? Infinity) - (nextOccurrence(b, now)?.getTime() ?? Infinity),
  )
  const dark = resolvedTheme === "dark"

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setSearch("")
      setPageId(null)
    }
  }

  /** Fecha o palette e só então roda a ação, pra diálogos abertos por ela não brigarem pelo foco. */
  function run(action: () => void) {
    handleOpenChange(false)
    requestAnimationFrame(action)
  }

  function openPage(schedule: Schedule) {
    setPageId(schedule.id)
    setSearch("")
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Comandos"
      description="Busque um agendamento ou uma ação"
      className="sm:max-w-lg"
    >
      <Command
        loop
        onKeyDown={(e) => {
          if (page && e.key === "Backspace" && !search) {
            e.preventDefault()
            setPageId(null)
          }
        }}
      >
        {page && (
          <button
            type="button"
            onClick={() => setPageId(null)}
            className="mx-1 mt-1 flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeftIcon className="size-3.5" />
            {page.time} · {page.name}
          </button>
        )}
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={page ? `O que fazer com "${page.name}"?` : "Buscar agendamentos e ações…"}
        />
        <CommandList className="max-h-[min(60svh,420px)]">
          <CommandEmpty>Nada encontrado.</CommandEmpty>

          {page ? (
            <CommandGroup>
              <CommandItem onSelect={() => run(() => actions.onRunNow(page))}>
                <ZapIcon />
                Testar agora
              </CommandItem>
              <CommandItem onSelect={() => run(() => actions.onToggle(page, !page.enabled))}>
                {page.enabled ? <PauseIcon /> : <PlayIcon />}
                {page.enabled ? "Pausar" : "Ativar"}
              </CommandItem>
              <CommandItem onSelect={() => run(() => actions.onEdit(page))}>
                <PencilIcon />
                Editar
              </CommandItem>
              <CommandItem onSelect={() => run(() => actions.onDuplicate(page))}>
                <CopyIcon />
                Duplicar
              </CommandItem>
              <CommandItem
                className="text-destructive data-selected:bg-destructive/10 data-selected:text-destructive [&_svg]:text-destructive!"
                onSelect={() => run(() => actions.onDelete(page))}>
                <Trash2Icon />
                Excluir
              </CommandItem>
            </CommandGroup>
          ) : (
            <>
              {spotifyConnected && search.trim() && (
                <CommandGroup heading="Spotify" forceMount>
                  <CommandItem
                    value={`__spotify ${search}`}
                    forceMount
                    onSelect={() => run(() => onSearchSpotify(search.trim()))}
                  >
                    <SearchIcon />
                    <span className="truncate">
                      Buscar <span className="font-medium">"{search.trim()}"</span> no Spotify
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {ordered.length > 0 && (
                <CommandGroup heading="Agendamentos">
                  {ordered.map((schedule) => {
                    const first = schedule.items[0]
                    return (
                      <CommandItem
                        key={schedule.id}
                        value={schedule.id}
                        keywords={[schedule.name, schedule.time, formatDays(schedule.days), first?.name ?? ""]}
                        onSelect={() => openPage(schedule)}
                        className={schedule.enabled ? undefined : "opacity-60"}
                      >
                        {first ? (
                          <ItemArtwork item={first} className="size-7 rounded" iconClassName="size-3.5" />
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded bg-muted">
                            <CalendarClockIcon className="size-3.5" />
                          </span>
                        )}
                        <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">{schedule.time}</span>
                        <span className="min-w-0 flex-1 truncate">{schedule.name}</span>
                        <CommandShortcut className="tracking-normal">{schedule.enabled ? formatDays(schedule.days) : "Pausado"}</CommandShortcut>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandGroup heading="App">
                <CommandItem onSelect={() => run(actions.onNew)}>
                  <CalendarPlusIcon />
                  Novo agendamento
                  <CommandShortcut>Ctrl+N</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => run(toggleSidebar)}>
                  <PanelLeftIcon />
                  {sidebarState === "expanded" ? "Recolher a fila" : "Expandir a fila"}
                  <CommandShortcut>Ctrl+B</CommandShortcut>
                </CommandItem>
                <CommandItem keywords={["tema", "escuro", "claro"]} onSelect={() => run(() => setTheme(dark ? "light" : "dark"))}>
                  {dark ? <SunIcon /> : <MoonIcon />}
                  {dark ? "Usar tema claro" : "Usar tema escuro"}
                </CommandItem>
                <CommandItem keywords={["spotify", "login", "conta"]} onSelect={() => run(onOpenAccount)}>
                  <UserIcon />
                  {spotifyConnected ? "Conta do Spotify" : "Conectar ao Spotify"}
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

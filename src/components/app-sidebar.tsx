import {
  CalendarClockIcon,
  CopyIcon,
  EllipsisIcon,
  ListPlusIcon,
  MoonIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SunIcon,
  Trash2Icon,
  UserIcon,
  ZapIcon,
} from "lucide-react"
import { useTheme } from "next-themes"

import appIcon from "@/assets/app-icon.svg"
import { Hint } from "@/components/hint"
import { ItemArtwork } from "@/components/item-artwork"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import type { SpotifyStatus } from "@/lib/api"
import { formatDays, nextOccurrence } from "@/lib/schedule"
import type { Schedule } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface ScheduleActions {
  onNew: () => void
  onEdit: (schedule: Schedule) => void
  onToggle: (schedule: Schedule, enabled: boolean) => void
  onDuplicate: (schedule: Schedule) => void
  onRunNow: (schedule: Schedule) => void
  onDelete: (schedule: Schedule) => void
}

interface AppSidebarProps extends ScheduleActions {
  schedules: Schedule[]
  now: Date
  spotify: SpotifyStatus | null
  onOpenAccount: () => void
}

export function AppSidebar({ schedules, now, spotify, onOpenAccount, ...actions }: AppSidebarProps) {
  // A fila: ativos na ordem em que vão disparar; pausados à parte.
  const active = schedules
    .filter((s) => s.enabled)
    .map((s) => ({ schedule: s, at: nextOccurrence(s, now) }))
    .sort((a, b) => (a.at?.getTime() ?? Infinity) - (b.at?.getTime() ?? Infinity))
    .map((entry) => entry.schedule)
  const paused = schedules.filter((s) => !s.enabled).sort((a, b) => a.time.localeCompare(b.time))
  // Recolhida, a lateral vira uma coluna de 72px com as capas centralizadas (12px de cada lado).
  const collapsed = useSidebar().state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="bg-black">
      {/* Continua a barra de título do cabeçalho principal, na mesma altura. */}
      {/* Aberta, tudo alinha numa coluna a 24px da borda: marca, títulos, capas e avatar. */}
      <div
        data-tauri-drag-region
        className={cn("flex h-14 shrink-0 items-center gap-2.5 select-none", collapsed ? "justify-center" : "px-6")}
      >
        <img src={appIcon} alt="" className="pointer-events-none size-5" draggable={false} />
        {!collapsed && (
          <span className="pointer-events-none truncate text-sm font-semibold tracking-tight">Spotify Scheduler</span>
        )}
      </div>
      <SidebarContent className="gap-0 group-data-[collapsible=icon]:overflow-auto">
        <SidebarGroup>
          <div className={cn("flex items-center pt-4 pb-2", collapsed ? "justify-center" : "justify-between px-4")}>
            {!collapsed && (
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Fila</span>
            )}
            <Hint label="Novo agendamento" shortcut="Ctrl+N" side="right">
              <button
                type="button"
                onClick={actions.onNew}
                aria-label="Novo agendamento"
                className={cn(
                  "flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "size-8 bg-white/[0.04]" : "-mr-1 size-6",
                )}
              >
                <PlusIcon className={collapsed ? "size-4" : "size-3.5"} />
              </button>
            </Hint>
          </div>
          <SidebarGroupContent>
            {active.length > 0 ? (
              <ScheduleMenu schedules={active} collapsed={collapsed} {...actions} />
            ) : (
              !collapsed && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">
                    <CalendarClockIcon className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {schedules.length === 0
                      ? "Nenhum agendamento ainda.\nEscolha uma playlist ao lado para começar."
                      : "Nenhum agendamento ativo."}
                  </p>
                </div>
              )
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {paused.length > 0 && (
          <SidebarGroup>
            {collapsed ? (
              <div className="mx-3 mt-2 mb-3 h-px bg-white/[0.08]" aria-hidden />
            ) : (
              <div className="px-4 pt-4 pb-2">
                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Pausados</span>
              </div>
            )}
            <SidebarGroupContent>
              <ScheduleMenu schedules={paused} collapsed={collapsed} {...actions} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "items-center gap-1 border-t border-white/[0.06] py-3",
          collapsed ? "flex-col px-0" : "flex-row px-4",
        )}
      >
        <AccountMenu spotify={spotify} collapsed={collapsed} onOpenAccount={onOpenAccount} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function ScheduleMenu({
  schedules,
  collapsed,
  ...actions
}: { schedules: Schedule[]; collapsed: boolean } & ScheduleActions) {
  return (
    <div className={cn("flex flex-col gap-1", !collapsed && "px-2")}>
      {schedules.map((schedule, index) => {
        const first = schedule.items[0]
        const isNext = index === 0
        return (
          <div
            key={schedule.id}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg transition-all",
              collapsed ? "p-1" : "p-2",
              isNext ? "bg-primary/[0.06]" : "hover:bg-white/[0.04]",
              !schedule.enabled && "opacity-40",
            )}
          >
            <div className="relative shrink-0">
              {first ? (
                <ItemArtwork item={first} className="size-12 rounded-md shadow-md" iconClassName="size-5" />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-md bg-white/[0.06]">
                  <CalendarClockIcon className="size-5 text-muted-foreground" />
                </div>
              )}
              <Hint label={schedule.mode === "play" ? "Tocar" : "Enfileirar"} side="top">
                <span
                  className={cn(
                    "absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full shadow-md ring-2 ring-background",
                    schedule.mode === "play" ? "bg-white" : "bg-zinc-600",
                  )}
                >
                  {schedule.mode === "play" ? (
                    <PlayIcon className="size-2.5 fill-current text-black" />
                  ) : (
                    <ListPlusIcon className="size-2.5 text-white" />
                  )}
                </span>
              </Hint>
            </div>

            {!collapsed && (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">{schedule.time}</span>
                  <span className="truncate text-sm font-semibold text-foreground">{schedule.name}</span>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {formatDays(schedule.days)}
                  {first && ` · ${first.name}`}
                  {schedule.items.length > 1 && ` +${schedule.items.length - 1}`}
                </span>
              </div>
            )}

            <DropdownMenu>
              {/* Recolhida, a capa inteira vira o gatilho do menu e o tooltip faz o papel do texto. */}
              <Hint
                label={collapsed ? `${schedule.time} · ${schedule.name}` : "Mais opções"}
                shortcut={collapsed ? formatDays(schedule.days) : undefined}
                side="right"
              >
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed
                        ? "absolute inset-0 rounded-lg"
                        : "flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.08] hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100",
                    )}
                    aria-label={`Ações de ${schedule.name}`}
                  >
                    {!collapsed && <EllipsisIcon className="size-4" />}
                  </button>
                </DropdownMenuTrigger>
              </Hint>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem onSelect={() => actions.onRunNow(schedule)}>
                  <ZapIcon />
                  Testar agora
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.onToggle(schedule, !schedule.enabled)}>
                  {schedule.enabled ? <PauseIcon /> : <PlayIcon />}
                  {schedule.enabled ? "Pausar" : "Ativar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => actions.onEdit(schedule)}>
                  <PencilIcon />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.onDuplicate(schedule)}>
                  <CopyIcon />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(schedule)}>
                  <Trash2Icon />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </div>
  )
}

// Fica dentro do SidebarFooter, que já dá o recuo de 16px; o p-2 do botão completa os 24px da coluna.
function AccountMenu({
  spotify,
  collapsed,
  onOpenAccount,
}: {
  spotify: SpotifyStatus | null
  collapsed: boolean
  onOpenAccount: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const user = spotify?.user
  const dark = resolvedTheme === "dark"

  return (
    <>
      <Hint label={user ? "Conta do Spotify" : "Conectar ao Spotify"} side={collapsed ? "right" : "top"}>
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label={collapsed ? (user ? "Conta do Spotify" : "Conectar ao Spotify") : undefined}
          className={cn(
            "flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "p-1" : "flex-1 p-2",
          )}
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="size-8 shrink-0 rounded-full object-cover ring-2 ring-white/10" />
          ) : (
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                user ? "bg-primary/15 text-primary" : "bg-white/[0.06] text-muted-foreground",
              )}
            >
              <UserIcon className="size-4" />
            </span>
          )}
          {!collapsed && (
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">
                {user ? (user.displayName ?? user.id) : "Conectar Spotify"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user ? "Conectado" : spotify?.error ? "Sessão expirada" : "Desconectado"}
              </span>
            </span>
          )}
        </button>
      </Hint>
      <Hint label={dark ? "Tema claro" : "Tema escuro"} side={collapsed ? "right" : "top"}>
        <button
          type="button"
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
          className={cn(collapsed ? "" : "mr-2", "flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
        >
          {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </button>
      </Hint>
    </>
  )
}

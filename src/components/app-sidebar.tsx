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
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarRail,
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

  return (
    <Sidebar className="bg-black">
      <SidebarContent className="gap-0 pt-2">
        <SidebarGroup>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Fila</span>
            <SidebarGroupAction
              title="Novo agendamento (Ctrl+N)"
              onClick={actions.onNew}
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
            >
              <PlusIcon className="size-3.5" />
              <span className="sr-only">Novo agendamento</span>
            </SidebarGroupAction>
          </div>
          <SidebarGroupContent>
            {active.length === 0 ? (
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
            ) : (
              <ScheduleMenu schedules={active} {...actions} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {paused.length > 0 && (
          <SidebarGroup>
            <div className="px-4 pt-4 pb-2">
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Pausados</span>
            </div>
            <SidebarGroupContent>
              <ScheduleMenu schedules={paused} {...actions} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <AccountMenu spotify={spotify} onOpenAccount={onOpenAccount} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function ScheduleMenu({ schedules, ...actions }: { schedules: Schedule[] } & ScheduleActions) {
  return (
    <div className="flex flex-col gap-1 px-2">
      {schedules.map((schedule, index) => {
        const first = schedule.items[0]
        const isNext = index === 0
        return (
          <div
            key={schedule.id}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg p-2 transition-all",
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
            </div>

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.08] hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ações de ${schedule.name}`}
                >
                  <EllipsisIcon className="size-4" />
                </button>
              </DropdownMenuTrigger>
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

function AccountMenu({ spotify, onOpenAccount }: { spotify: SpotifyStatus | null; onOpenAccount: () => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  const user = spotify?.user

  return (
    <div className="border-t border-white/[0.06] p-2">
      <button
        type="button"
        onClick={onOpenAccount}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-white/[0.04]"
      >
        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/10"
          />
        ) : (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              user ? "bg-primary/15 text-primary" : "bg-white/[0.06] text-muted-foreground",
            )}
          >
            <UserIcon className="size-4" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">
            {user ? (user.displayName ?? user.id) : "Conectar Spotify"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user ? "Conectado" : spotify?.error ? "Sessão expirada" : "Desconectado"}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation()
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          }}
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </span>
      </button>
    </div>
  )
}

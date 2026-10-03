import { CalendarPlusIcon, CheckIcon, CommandIcon, ListPlusIcon, PlugIcon, SearchIcon, XIcon } from "lucide-react"

import { Hint } from "@/components/hint"
import { ItemArtwork } from "@/components/item-artwork"
import { contextKit, dropdownKit, type MenuKit } from "@/components/menu-kit"
import { WindowControls } from "@/components/window-controls"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useGridFlip } from "@/hooks/use-grid-flip"
import { useSpotifySearch } from "@/hooks/use-spotify-search"
import type { Schedule, SpotifyItem } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LibraryViewProps {
  /** null enquanto o status do Spotify ainda está carregando. */
  connected: boolean | null
  schedules: Schedule[]
  onConnect: () => void
  onSchedule: (item: SpotifyItem) => void
  onAddTo: (schedule: Schedule, item: SpotifyItem) => void
  /** A busca mora no App para o command palette também poder preenchê-la. */
  query: string
  onQueryChange: (query: string) => void
  onOpenCommands: () => void
}

export function LibraryView({
  connected,
  schedules,
  onConnect,
  onSchedule,
  onAddTo,
  query,
  onQueryChange: setQuery,
  onOpenCommands,
}: LibraryViewProps) {
  const { results, loading, error } = useSpotifySearch(query, connected === true)
  const searching = query.trim().length > 0

  const playlists = results.filter((i) => i.type === "playlist")
  const albums = results.filter((i) => i.type === "album")
  const tracks = results.filter((i) => i.type === "track")
  const menu = { schedules, onSchedule, onAddTo }

  return (
    <>
      {/* Também é a barra de título: o espaço vazio arrasta a janela (duplo clique maximiza). */}
      <header
        data-tauri-drag-region
        className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 pl-4 backdrop-blur select-none"
      >
        <Hint label="Recolher ou expandir a fila" shortcut="Ctrl+B">
          <SidebarTrigger className="-ml-1" aria-label="Recolher ou expandir a fila" />
        </Hint>
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-center" />
        <InputGroup className="max-w-md min-w-0">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            id="library-search"
            placeholder="Buscar músicas, álbuns e playlists"
            value={query}
            disabled={connected !== true}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && (
            <InputGroupAddon align="inline-end">
              <Hint label="Limpar busca">
                <InputGroupButton size="icon-xs" aria-label="Limpar busca" onClick={() => setQuery("")}>
                  <XIcon />
                </InputGroupButton>
              </Hint>
            </InputGroupAddon>
          )}
        </InputGroup>
        <Hint label="Ações, agendamentos e busca" shortcut="Ctrl+K">
          <button
            type="button"
            onClick={onOpenCommands}
            className="ml-auto flex h-8 shrink-0 items-center gap-2 rounded-md px-2.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CommandIcon className="size-3.5" />
            <span className="hidden lg:inline">Comandos</span>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] leading-none whitespace-nowrap">Ctrl K</kbd>
          </button>
        </Hint>
        <WindowControls className="ml-2" />
      </header>

      <div className="flex-1 p-4 md:p-6">
        {connected === null ? (
          <Section title="Carregando…">
            <CardGrid>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 p-2">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </CardGrid>
          </Section>
        ) : !connected ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PlugIcon />
              </EmptyMedia>
              <EmptyTitle>Conecte sua conta do Spotify</EmptyTitle>
              <EmptyDescription>
                Suas playlists aparecem aqui. Escolha uma e diga em que horário ela deve tocar.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onConnect}>Conectar Spotify</Button>
            </EmptyContent>
          </Empty>
        ) : error ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyTitle>Não consegui falar com o Spotify</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : loading && results.length === 0 ? (
          <Section title={searching ? "Buscando…" : "Suas playlists"}>
            <CardGrid>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2 p-2">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </CardGrid>
          </Section>
        ) : results.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyTitle>{searching ? "Nada encontrado" : "Nenhuma playlist"}</EmptyTitle>
              <EmptyDescription>
                {searching
                  ? `Nenhum resultado para "${query.trim()}". Tente outro termo.`
                  : "Busque um álbum, playlist ou música acima. Clique em um item para agendá-lo."}
              </EmptyDescription>
            </EmptyHeader>
            {!searching && (
              <EmptyContent>
                <p className="text-xs text-muted-foreground">
                  Dica: use <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Ctrl+N</kbd> para criar um agendamento rápido.
                </p>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="flex flex-col gap-8">
            {tracks.length > 0 && (
              <Section title="Músicas">
                <TrackGrid>
                  {tracks.map((item) => (
                    <ItemMenu key={item.uri} item={item} {...menu}>
                      <TrackRow item={item} />
                    </ItemMenu>
                  ))}
                </TrackGrid>
              </Section>
            )}
            {playlists.length > 0 && (
              <Section title={searching ? "Playlists" : "Suas playlists"}>
                <CardGrid>
                  {playlists.map((item) => (
                    <ItemMenu key={item.uri} item={item} {...menu}>
                      <MediaCard item={item} />
                    </ItemMenu>
                  ))}
                </CardGrid>
              </Section>
            )}
            {albums.length > 0 && (
              <Section title="Álbuns">
                <CardGrid>
                  {albums.map((item) => (
                    <ItemMenu key={item.uri} item={item} {...menu}>
                      <MediaCard item={item} />
                    </ItemMenu>
                  ))}
                </CardGrid>
              </Section>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Quando as colunas mudam (janela redimensionada, fila recolhida), os cards
// deslizam até a nova posição em vez de pular (ver useGridFlip).
function CardGrid({ children }: { children: React.ReactNode }) {
  const parent = useGridFlip<HTMLDivElement>()
  return (
    <div ref={parent} className="relative -mx-2 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
      {children}
    </div>
  )
}

function TrackGrid({ children }: { children: React.ReactNode }) {
  const parent = useGridFlip<HTMLDivElement>()
  return (
    <div ref={parent} className="relative grid gap-x-4 lg:grid-cols-2">
      {children}
    </div>
  )
}

// Os dois "cards" abaixo são botões: o Radix injeta onClick/aria via asChild do ItemMenu.

function MediaCard({ item, className, ...props }: { item: SpotifyItem } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/card flex min-w-0 flex-col gap-2 rounded-lg p-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-muted/60",
        className,
      )}
      {...props}
    >
      <div className="relative">
        <ItemArtwork item={item} className="aspect-square size-auto w-full shadow-sm" iconClassName="size-10" />
        <span className="absolute right-2 bottom-2 flex size-10 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100 group-data-[state=open]/card:translate-y-0 group-data-[state=open]/card:opacity-100">
          <CalendarPlusIcon className="size-5" />
        </span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{item.name}</span>
        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
      </div>
    </button>
  )
}

function TrackRow({ item, className, ...props }: { item: SpotifyItem } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/row flex min-w-0 items-center gap-3 rounded-md p-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-muted/60",
        className,
      )}
      {...props}
    >
      <ItemArtwork item={item} className="size-10" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{item.name}</span>
        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
      </span>
      <CalendarPlusIcon className="size-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 group-data-[state=open]/row:opacity-100" />
    </button>
  )
}

interface ItemMenuProps {
  item: SpotifyItem
  schedules: Schedule[]
  onSchedule: (item: SpotifyItem) => void
  onAddTo: (schedule: Schedule, item: SpotifyItem) => void
  children: React.ReactElement
}

function ItemMenu({ item, schedules, onSchedule, onAddTo, children }: ItemMenuProps) {
  // Clique abre o dropdown; clique direito abre o mesmo menu onde o mouse está.
  return (
    <DropdownMenu>
      <ContextMenu>
        <DropdownMenuTrigger asChild>
          <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        </DropdownMenuTrigger>
        <ContextMenuContent className="w-60">
          <ItemMenuItems kit={contextKit} item={item} schedules={schedules} onSchedule={onSchedule} onAddTo={onAddTo} />
        </ContextMenuContent>
      </ContextMenu>
      <DropdownMenuContent align="start" className="w-60">
        <ItemMenuItems kit={dropdownKit} item={item} schedules={schedules} onSchedule={onSchedule} onAddTo={onAddTo} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ItemMenuItems({
  kit: { Item, Label, Separator, Sub, SubTrigger, SubContent },
  item,
  schedules,
  onSchedule,
  onAddTo,
}: { kit: MenuKit } & Omit<ItemMenuProps, "children">) {
  const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <>
      <Label className="truncate">{item.name}</Label>
      <Item onSelect={() => onSchedule(item)}>
        <CalendarPlusIcon />
        Novo agendamento…
      </Item>
      {sorted.length > 0 && (
        <>
          <Separator />
          <Sub>
            <SubTrigger>
              <ListPlusIcon />
              Adicionar a
            </SubTrigger>
            <SubContent className="w-60">
              {sorted.map((schedule) => {
                const included = schedule.items.some((i) => i.uri === item.uri)
                return (
                  <Item key={schedule.id} disabled={included} onSelect={() => onAddTo(schedule, item)}>
                    <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">{schedule.time}</span>
                    <span className="flex-1 truncate">{schedule.name}</span>
                    {included && <CheckIcon />}
                  </Item>
                )
              })}
            </SubContent>
          </Sub>
        </>
      )}
    </>
  )
}

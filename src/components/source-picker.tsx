import { useState } from "react"
import { Loader2Icon, SearchIcon } from "lucide-react"

import { ItemArtwork } from "@/components/item-artwork"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSpotifySearch } from "@/hooks/use-spotify-search"
import type { SpotifyItem, SpotifyItemType } from "@/lib/types"

const GROUPS: { type: SpotifyItemType; heading: string }[] = [
  { type: "playlist", heading: "Playlists" },
  { type: "album", heading: "Álbuns" },
  { type: "track", heading: "Músicas" },
]

interface SourcePickerProps {
  /** Em `single`, escolher um item substitui o atual; em `multiple`, alterna. */
  selection: "single" | "multiple"
  value: SpotifyItem[]
  onChange: (items: SpotifyItem[]) => void
  invalid?: boolean
}

export function SourcePicker({ selection, value, onChange, invalid }: SourcePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { results, loading, error } = useSpotifySearch(query, open)

  const isSelected = (uri: string) => value.some((item) => item.uri === uri)

  function handleSelect(item: SpotifyItem) {
    if (selection === "single") {
      onChange([item])
      setOpen(false)
      return
    }
    onChange(isSelected(item.uri) ? value.filter((v) => v.uri !== item.uri) : [...value, item])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-start font-normal text-muted-foreground"
        >
          <SearchIcon data-icon="inline-start" />
          {selection === "single" ? "Buscar playlist, álbum ou música…" : "Adicionar à fila…"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar no Spotify…" value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && results.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Buscando…
              </div>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-destructive">{error}</p>
            ) : (
              <CommandEmpty>Nada encontrado.</CommandEmpty>
            )}
            {GROUPS.map(({ type, heading }) => {
              const items = results.filter((item) => item.type === type)
              if (items.length === 0) return null
              return (
                <CommandGroup key={type} heading={!query.trim() && type === "playlist" ? "Suas playlists" : heading}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.uri}
                      value={item.uri}
                      data-checked={isSelected(item.uri)}
                      onSelect={() => handleSelect(item)}
                    >
                      <ItemArtwork item={item} className="size-8" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{item.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

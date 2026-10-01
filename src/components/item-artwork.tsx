import { Disc3Icon, ListMusicIcon, MusicIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SpotifyItem, SpotifyItemType } from "@/lib/types"

const ICONS: Record<SpotifyItemType, typeof MusicIcon> = {
  playlist: ListMusicIcon,
  album: Disc3Icon,
  track: MusicIcon,
}

interface ItemArtworkProps {
  item: SpotifyItem
  className?: string
  iconClassName?: string
}

export function ItemArtwork({ item, className, iconClassName }: ItemArtworkProps) {
  const Icon = ICONS[item.type]

  if (item.imageUrl) {
    return <img src={item.imageUrl} alt="" className={cn("size-9 shrink-0 rounded-md object-cover", className)} />
  }

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className={cn("size-4", iconClassName)} />
    </div>
  )
}

/** 0 = domingo … 6 = sábado (mesmo padrão do Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/**
 * - `play`: no horário, começa a tocar o item (substitui o que está tocando).
 * - `queue`: no horário, adiciona os itens ao fim da fila atual.
 */
export type ScheduleMode = "play" | "queue"

export type SpotifyItemType = "playlist" | "album" | "track"

export interface SpotifyItem {
  uri: string
  type: SpotifyItemType
  name: string
  subtitle: string
  imageUrl?: string
}

export interface Schedule {
  id: string
  name: string
  /** "HH:MM" no horário local. */
  time: string
  days: Weekday[]
  enabled: boolean
  mode: ScheduleMode
  items: SpotifyItem[]
  shuffle: boolean
}

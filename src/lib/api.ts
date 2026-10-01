import { invoke } from "@tauri-apps/api/core"

import type { Schedule, SpotifyItem } from "@/lib/types"

// Wrappers tipados dos comandos em `src-tauri/src/commands.rs`.
// Erros chegam como string já em português, prontos para mostrar.

export interface SpotifyProfile {
  id: string
  displayName: string | null
  imageUrl: string | null
}

export interface SpotifyStatus {
  clientId: string | null
  redirectUri: string
  user: SpotifyProfile | null
  error: string | null
}

/** Payload do evento `schedule-fired`, emitido a cada disparo do agendador. */
export interface ScheduleFiredEvent {
  id: string
  name: string
  ok: boolean
  message: string
}

export const api = {
  spotifyStatus: () => invoke<SpotifyStatus>("spotify_status"),
  setClientId: (clientId: string) => invoke<void>("set_client_id", { clientId }),
  spotifyLogin: () => invoke<SpotifyProfile>("spotify_login"),
  spotifyLogout: () => invoke<void>("spotify_logout"),
  spotifySearch: (query: string) => invoke<SpotifyItem[]>("spotify_search", { query }),
  getSchedules: () => invoke<Schedule[]>("get_schedules"),
  saveSchedules: (schedules: Schedule[]) => invoke<void>("save_schedules", { schedules }),
  runScheduleNow: (schedule: Schedule) => invoke<string>("run_schedule_now", { schedule }),
}

export function errorMessage(error: unknown) {
  return typeof error === "string" ? error : error instanceof Error ? error.message : "Erro inesperado."
}

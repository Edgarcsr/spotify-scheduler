import { useEffect, useState } from "react"

import { api, errorMessage } from "@/lib/api"
import type { SpotifyItem } from "@/lib/types"

/**
 * Busca no Spotify com debounce. Busca vazia lista as playlists do usuário.
 * Só busca enquanto `enabled` for true (popover aberto, conta conectada…).
 */
export function useSpotifySearch(query: string, enabled = true) {
  const [results, setResults] = useState<SpotifyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(
      () => {
        api
          .spotifySearch(query)
          .then((items) => {
            if (cancelled) return
            setResults(items)
            setError(null)
          })
          .catch((e) => {
            if (cancelled) return
            setResults([])
            setError(errorMessage(e))
          })
          .finally(() => !cancelled && setLoading(false))
      },
      // Debounce para não gastar a cota da API a cada tecla.
      query.trim() ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, enabled])

  return { results, loading, error }
}

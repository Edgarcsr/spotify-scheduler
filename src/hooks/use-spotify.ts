import { useCallback, useEffect, useState } from "react"

import { api, type SpotifyStatus } from "@/lib/api"

/** Estado da conexão com o Spotify e as ações de login. */
export function useSpotify() {
  const [status, setStatus] = useState<SpotifyStatus | null>(null)

  const refresh = useCallback(async () => {
    setStatus(await api.spotifyStatus())
  }, [])

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  const login = useCallback(
    async (clientId: string) => {
      await api.setClientId(clientId)
      await api.spotifyLogin()
      await refresh()
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    await api.spotifyLogout()
    await refresh()
  }, [refresh])

  return { status, connected: !!status?.user, login, logout }
}

import { useEffect, useState } from "react"

/** Data atual, atualizada a cada `intervalMs`. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { api, errorMessage } from "@/lib/api"
import type { Schedule } from "@/lib/types"

/** Agendamentos, persistidos pelo backend (é ele quem dispara). */
export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loaded, setLoaded] = useState(false)
  const skipNextSave = useRef(true)

  useEffect(() => {
    api
      .getSchedules()
      .then(setSchedules)
      .catch((e) => toast.error("Não consegui carregar os agendamentos", { description: errorMessage(e) }))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    // A primeira passada após carregar é o próprio valor carregado.
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    api
      .saveSchedules(schedules)
      .catch((e) => toast.error("Não consegui salvar os agendamentos", { description: errorMessage(e) }))
  }, [schedules, loaded])

  const save = useCallback((schedule: Schedule) => {
    setSchedules((prev) =>
      prev.some((s) => s.id === schedule.id)
        ? prev.map((s) => (s.id === schedule.id ? schedule : s))
        : [...prev, schedule],
    )
  }, [])

  const remove = useCallback((id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const toggle = useCallback((id: string, enabled: boolean) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)))
  }, [])

  const duplicate = useCallback((id: string) => {
    setSchedules((prev) => {
      const original = prev.find((s) => s.id === id)
      if (!original) return prev
      return [...prev, { ...original, id: crypto.randomUUID(), name: `${original.name} (cópia)`, enabled: false }]
    })
  }, [])

  return { schedules, loaded, save, remove, toggle, duplicate }
}

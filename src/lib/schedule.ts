import type { Schedule, Weekday } from "@/lib/types"

/** Ordem de exibição: semana começando na segunda. */
export const WEEKDAYS: { value: Weekday; short: string; label: string }[] = [
  { value: 1, short: "S", label: "Seg" },
  { value: 2, short: "T", label: "Ter" },
  { value: 3, short: "Q", label: "Qua" },
  { value: 4, short: "Q", label: "Qui" },
  { value: 5, short: "S", label: "Sex" },
  { value: 6, short: "S", label: "Sáb" },
  { value: 0, short: "D", label: "Dom" },
]

const WEEKDAY_SET = [0, 1, 2, 3, 4, 5, 6]

function sameDays(days: Weekday[], expected: number[]) {
  return days.length === expected.length && expected.every((d) => days.includes(d as Weekday))
}

export function formatDays(days: Weekday[]) {
  if (days.length === 0) return "Nenhum dia"
  if (sameDays(days, WEEKDAY_SET)) return "Todos os dias"
  if (sameDays(days, [1, 2, 3, 4, 5])) return "Dias úteis"
  if (sameDays(days, [0, 6])) return "Fins de semana"
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.label)
    .join(", ")
}

/** Próximo disparo do agendamento a partir de `from`, ou null se não houver dias. */
export function nextOccurrence(schedule: Schedule, from: Date): Date | null {
  if (schedule.days.length === 0) return null
  const [hours, minutes] = schedule.time.split(":").map(Number)

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(from)
    candidate.setDate(from.getDate() + offset)
    candidate.setHours(hours, minutes, 0, 0)
    if (candidate > from && schedule.days.includes(candidate.getDay() as Weekday)) {
      return candidate
    }
  }
  return null
}

export function findNextRun(schedules: Schedule[], from: Date) {
  let next: { schedule: Schedule; at: Date } | null = null
  for (const schedule of schedules) {
    if (!schedule.enabled) continue
    const at = nextOccurrence(schedule, from)
    if (at && (!next || at < next.at)) next = { schedule, at }
  }
  return next
}

export function formatCountdown(target: Date, now: Date) {
  const totalMinutes = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60_000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `em ${days}d ${hours}h`
  if (hours > 0) return `em ${hours}h ${minutes.toString().padStart(2, "0")}min`
  return `em ${minutes}min`
}

export function formatRunDay(target: Date, now: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  return target.toLocaleDateString("pt-BR", { weekday: "long" })
}

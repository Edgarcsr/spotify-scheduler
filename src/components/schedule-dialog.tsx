import { useState } from "react"
import { XIcon } from "lucide-react"

import { ItemArtwork } from "@/components/item-artwork"
import { SourcePicker } from "@/components/source-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { WEEKDAYS } from "@/lib/schedule"
import type { Schedule, ScheduleMode, SpotifyItem, Weekday } from "@/lib/types"

function emptySchedule(prefill?: SpotifyItem | null): Schedule {
  return {
    id: crypto.randomUUID(),
    name: prefill?.name ?? "",
    time: "08:00",
    days: [1, 2, 3, 4, 5],
    enabled: true,
    mode: "play",
    items: prefill ? [prefill] : [],
    shuffle: false,
  }
}

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Agendamento a editar; `null` cria um novo. */
  schedule: Schedule | null
  /** Item já escolhido ao criar a partir da biblioteca. */
  prefill?: SpotifyItem | null
  onSave: (schedule: Schedule) => void
}

export function ScheduleDialog({ open, onOpenChange, schedule, prefill, onSave }: ScheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {/* `key` reinicia o estado do formulário a cada abertura */}
        {open && (
          <ScheduleForm
            key={schedule?.id ?? `new-${prefill?.uri ?? ""}`}
            initial={schedule ?? emptySchedule(prefill)}
            isNew={!schedule}
            onCancel={() => onOpenChange(false)}
            onSave={(s) => {
              onSave(s)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ScheduleFormProps {
  initial: Schedule
  isNew: boolean
  onCancel: () => void
  onSave: (schedule: Schedule) => void
}

function ScheduleForm({ initial, isNew, onCancel, onSave }: ScheduleFormProps) {
  const [draft, setDraft] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  const update = <K extends keyof Schedule>(key: K, value: Schedule[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const errors = {
    name: draft.name.trim() ? null : "Dê um nome ao agendamento.",
    days: draft.days.length > 0 ? null : "Escolha pelo menos um dia.",
    items: draft.items.length > 0 ? null : "Escolha o que vai tocar.",
  }
  const show = (key: keyof typeof errors) => (submitted ? errors[key] : null)

  function changeMode(mode: ScheduleMode) {
    // "Tocar" aceita só um item; ao trocar, mantém o primeiro.
    setDraft((d) => ({ ...d, mode, items: mode === "play" ? d.items.slice(0, 1) : d.items }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>{isNew ? "Novo agendamento" : "Editar agendamento"}</DialogTitle>
        <DialogDescription>Escolha quando e o que o Spotify deve tocar.</DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field data-invalid={!!show("name")}>
            <FieldLabel htmlFor="schedule-name">Nome</FieldLabel>
            <Input
              id="schedule-name"
              placeholder="Ex.: Acordar"
              value={draft.name}
              aria-invalid={!!show("name")}
              onChange={(e) => update("name", e.target.value)}
              autoFocus
            />
            <FieldError>{show("name")}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="schedule-time">Horário</FieldLabel>
            <Input
              id="schedule-time"
              type="time"
              required
              className="tabular-nums"
              value={draft.time}
              onChange={(e) => e.target.value && update("time", e.target.value)}
            />
          </Field>
        </div>

        <Field data-invalid={!!show("days")}>
          <FieldLabel>Dias</FieldLabel>
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={0}
            className="w-full"
            value={draft.days.map(String)}
            onValueChange={(values) => update("days", values.map(Number) as Weekday[])}
          >
            {WEEKDAYS.map((day) => (
              <ToggleGroupItem
                key={day.value}
                value={String(day.value)}
                aria-label={day.label}
                className="flex-1 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
              >
                {day.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldError>{show("days")}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Ação</FieldLabel>
          <RadioGroup
            value={draft.mode}
            onValueChange={(v) => changeMode(v as ScheduleMode)}
            className="grid grid-cols-2 gap-3"
          >
            <FieldLabel htmlFor="mode-play">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Tocar</FieldTitle>
                  <FieldDescription>Substitui o que estiver tocando.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="play" id="mode-play" />
              </Field>
            </FieldLabel>
            <FieldLabel htmlFor="mode-queue">
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Enfileirar</FieldTitle>
                  <FieldDescription>Adiciona ao fim da fila atual.</FieldDescription>
                </FieldContent>
                <RadioGroupItem value="queue" id="mode-queue" />
              </Field>
            </FieldLabel>
          </RadioGroup>
        </Field>

        <Field data-invalid={!!show("items")}>
          <FieldLabel>{draft.mode === "play" ? "O que tocar" : "O que enfileirar"}</FieldLabel>
          {draft.mode === "queue" && (
            <FieldDescription>
              Músicas e álbuns funcionam sempre. De playlists, o Spotify só libera as suas ou colaborativas.
            </FieldDescription>
          )}
          <SourcePicker
            selection={draft.mode === "play" ? "single" : "multiple"}
            value={draft.items}
            onChange={(items) => update("items", items)}
            invalid={!!show("items")}
          />
          {draft.items.length > 0 && (
            <ul className="grid gap-1 rounded-lg border p-1">
              {draft.items.map((item, index) => (
                <li key={item.uri} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-muted/50">
                  {draft.mode === "queue" && (
                    <span className="w-4 text-center text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                  )}
                  <ItemArtwork item={item} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${item.name}`}
                    onClick={() => update("items", draft.items.filter((i) => i.uri !== item.uri))}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <FieldError>{show("items")}</FieldError>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="schedule-shuffle">Modo aleatório</FieldLabel>
            <FieldDescription>Ativa o shuffle antes de começar.</FieldDescription>
          </FieldContent>
          <Switch
            id="schedule-shuffle"
            checked={draft.shuffle}
            onCheckedChange={(checked) => update("shuffle", checked)}
          />
        </Field>

        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Atalhos:</strong>{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Ctrl+N</kbd> novo ·{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Enter</kbd> editar ·{" "}
          <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Espaço</kbd> pausar/ativar
        </p>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{isNew ? "Criar agendamento" : "Salvar"}</Button>
      </DialogFooter>
    </form>
  )
}

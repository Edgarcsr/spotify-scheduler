import { useState } from "react"
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, LogOutIcon, UserIcon } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { toast } from "sonner"

import { Hint } from "@/components/hint"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { errorMessage, type SpotifyStatus } from "@/lib/api"

const DASHBOARD_URL = "https://developer.spotify.com/dashboard"

interface SpotifyConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: SpotifyStatus | null
  onLogin: (clientId: string) => Promise<void>
  onLogout: () => Promise<void>
}

export function SpotifyConnectDialog({ open, onOpenChange, status, onLogin, onLogout }: SpotifyConnectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        {open &&
          (status?.user ? (
            <Connected status={status} onLogout={onLogout} />
          ) : (
            <Setup status={status} onLogin={onLogin} onDone={() => onOpenChange(false)} />
          ))}
      </DialogContent>
    </Dialog>
  )
}

function Connected({ status, onLogout }: { status: SpotifyStatus; onLogout: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const user = status.user
  const name = user?.displayName ?? user?.id ?? ""

  async function copyClientId() {
    await navigator.clipboard.writeText(status.clientId ?? "")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Conta do Spotify</DialogTitle>
        <DialogDescription>Os agendamentos tocam nesta conta.</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-4 py-2">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="size-14 shrink-0 rounded-full object-cover ring-2 ring-foreground/10" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary uppercase">
            {name.charAt(0) || <UserIcon className="size-6" />}
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-semibold">{name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#3DCB6E]" aria-hidden />
            Conectado
          </span>
        </div>
      </div>

      {status.clientId && (
        <Field>
          <FieldLabel htmlFor="connected-client-id">Client ID</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="connected-client-id"
              readOnly
              value={status.clientId}
              className="font-mono text-xs text-muted-foreground"
            />
            <InputGroupAddon align="inline-end">
              <Hint label={copied ? "Copiado" : "Copiar"}>
                <InputGroupButton size="icon-xs" aria-label="Copiar Client ID" onClick={copyClientId}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </InputGroupButton>
              </Hint>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      )}

      <DialogFooter className="sm:justify-between">
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            onLogout()
              .catch((e) => toast.error(errorMessage(e)))
              .finally(() => setBusy(false))
          }}
        >
          {busy ? <Loader2Icon data-icon="inline-start" className="animate-spin" /> : <LogOutIcon data-icon="inline-start" />}
          Desconectar
        </Button>
        <DialogClose asChild>
          <Button>Pronto</Button>
        </DialogClose>
      </DialogFooter>
    </>
  )
}

function Setup({
  status,
  onLogin,
  onDone,
}: {
  status: SpotifyStatus | null
  onLogin: (clientId: string) => Promise<void>
  onDone: () => void
}) {
  const [clientId, setClientId] = useState(status?.clientId ?? "")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const redirectUri = status?.redirectUri ?? ""

  async function copyRedirect() {
    await navigator.clipboard.writeText(redirectUri)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await onLogin(clientId.trim())
      toast.success("Spotify conectado")
      onDone()
    } catch (err) {
      toast.error("Não foi possível conectar", { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>Conectar ao Spotify</DialogTitle>
        <DialogDescription>
          O app usa a sua própria chave da API do Spotify. É de graça, mas a conta precisa ser Premium.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground ring-1 ring-primary/10">
        <strong className="font-medium text-foreground">Por que preciso disso?</strong> O Spotify exige que cada app tenha
        uma chave própria. Sem ela, o app não pode tocar música na sua conta. Leva ~2 minutos.
      </div>

      {status?.error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{status.error}</p>
      )}

      <FieldGroup>
        <Field>
          <FieldLabel>1. Crie um app no Spotify for Developers</FieldLabel>
          <FieldDescription>Em "Which API/SDKs are you planning to use?", marque Web API.</FieldDescription>
          <Button type="button" variant="outline" className="w-fit" onClick={() => openUrl(DASHBOARD_URL)}>
            Abrir dashboard
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        </Field>

        <Field>
          <FieldLabel htmlFor="redirect-uri">2. Adicione esta Redirect URI</FieldLabel>
          <InputGroup>
            <InputGroupInput id="redirect-uri" readOnly value={redirectUri} className="font-mono text-xs" />
            <InputGroupAddon align="inline-end">
              <Hint label={copied ? "Copiado" : "Copiar"}>
                <InputGroupButton size="icon-xs" aria-label="Copiar" onClick={copyRedirect}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </InputGroupButton>
              </Hint>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="client-id">3. Cole o Client ID</FieldLabel>
          <Input
            id="client-id"
            required
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            placeholder="ex.: 3f4b1c…"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <FieldDescription>Não precisa do Client Secret.</FieldDescription>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={busy || !clientId.trim()}>
          {busy && <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          {busy ? "Aguardando o navegador…" : "Conectar com Spotify"}
        </Button>
      </DialogFooter>
    </form>
  )
}

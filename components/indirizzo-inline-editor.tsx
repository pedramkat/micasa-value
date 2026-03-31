"use client"

import * as React from "react"

type Props = {
  initialValue: string
  onSave: (nextValue: string) => Promise<{ ok: true } | { ok: false; error: string }>
}

export function IndirizzoInlineEditor({ initialValue, onSave }: Props) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [value, setValue] = React.useState(initialValue)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    if (isEditing) {
      window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [isEditing])

  const commit = React.useCallback(() => {
    const next = value.trim()
    if (!next) {
      setIsEditing(false)
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await onSave(next)
      if (!res.ok) {
        setError(res.error)
      }
      setIsEditing(false)
    })
  }, [onSave, value])

  return (
    <div className="rounded-lg bg-muted/50 px-4 py-3 ring-1 ring-border">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indirizzo</div>

      {isEditing ? (
        <input
          ref={inputRef}
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            }
            if (e.key === "Escape") {
              e.preventDefault()
              setValue(initialValue)
              setError(null)
              setIsEditing(false)
            }
          }}
          className="mt-1 w-full rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setIsEditing(true)
          }}
          className="mt-1 block w-full rounded-md bg-background px-3 py-2 text-left text-sm font-semibold text-foreground ring-1 ring-border hover:bg-muted"
        >
          {value.trim() ? value : "Click to set address"}
        </button>
      )}

      {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}
    </div>
  )
}

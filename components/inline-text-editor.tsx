"use client"

import * as React from "react"

type Props = {
  label?: string
  initialValue: string
  placeholder?: string
  multiline?: boolean
  onSave: (nextValue: string) => Promise<{ ok: true } | { ok: false; error: string }>
  className?: string
  textClassName?: string
}

export function InlineTextEditor({
  label,
  initialValue,
  placeholder,
  multiline,
  onSave,
  className,
  textClassName,
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [value, setValue] = React.useState(initialValue)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    if (isEditing) {
      globalThis.setTimeout(() => {
        inputRef.current?.focus()
        ;(inputRef.current as any)?.select?.()
      }, 0)
    }
  }, [isEditing])

  const commit = React.useCallback(() => {
    const next = value.trim()
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
    <div className={className}>
      {label && <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>}

      {isEditing ? (
        multiline ? (
          <textarea
            ref={inputRef as any}
            value={value}
            disabled={isPending}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            rows={6}
            className="mt-1 w-full resize-y rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        ) : (
          <input
            ref={inputRef as any}
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
        )
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setIsEditing(true)
          }}
          className={`mt-1 block w-full rounded-md bg-transparent text-left hover:bg-muted ${textClassName ?? ""}`}
        >
          {value.trim() ? value : placeholder ?? "Click to edit"}
        </button>
      )}

      {error && <div className="mt-2 text-sm font-semibold text-red-600">{error}</div>}
    </div>
  )
}

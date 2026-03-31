"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"

type PriceParameterItem = {
  title: string
  value: string
  found: boolean
}

type EligibleOption = {
  title: string
  fixValue: string | null
}

type Props = {
  formId: string
  initialItems: PriceParameterItem[]
  eligibleOptions: EligibleOption[]
  onRemove: (title: string) => Promise<void>
}

export function PriceParametersEditor({ formId, initialItems, eligibleOptions, onRemove }: Props) {
  const [items, setItems] = React.useState<PriceParameterItem[]>(initialItems)
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()

  const itemsLower = React.useMemo(() => new Set(items.map((i) => i.title.toLowerCase())), [items])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return eligibleOptions
      .filter((o) => !itemsLower.has(o.title.toLowerCase()))
      .filter((o) => (q ? o.title.toLowerCase().includes(q) : true))
      .slice(0, 20)
  }, [eligibleOptions, itemsLower, query])

  const addOption = React.useCallback(
    (o: EligibleOption) => {
      setItems((prev) => {
        if (prev.some((p) => p.title.toLowerCase() === o.title.toLowerCase())) return prev
        const nextValue = o.fixValue ?? ""
        return [...prev, { title: o.title, value: nextValue, found: true }]
      })
      setQuery("")
      setOpen(false)
    },
    [setItems]
  )

  return (
    <div className="mt-4 space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120)
          }}
          placeholder="Search and add a configuration…"
          className="w-full rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border"
        />

        {open && filtered.length > 0 && (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-md bg-popover shadow-lg ring-1 ring-border text-popover-foreground">
            {filtered.map((o) => (
              <button
                key={o.title}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addOption(o)}
              >
                <span className="min-w-0 flex-1 truncate">{o.title}</span>
                <span className="shrink-0 font-semibold">{o.fixValue ?? ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.map((c, idx) => (
        <div
          key={c.title}
          className="flex flex-col gap-2 rounded-lg bg-muted/50 px-4 py-3 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="text-sm font-semibold text-foreground">{c.title}</div>
          <div className="flex items-center gap-2">
            <input type="hidden" name={`cfg_title_${idx}`} value={c.title} form={formId} />
            <input
              name={`cfg_value_${idx}`}
              form={formId}
              inputMode="decimal"
              value={c.value}
              onChange={(e) => {
                const v = e.target.value
                setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, value: v } : p)))
              }}
              className="w-28 rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground ring-1 ring-border"
            />

            <button
              type="button"
              aria-label={`Remove ${c.title}`}
              disabled={isPending}
              onClick={() => {
                const title = c.title
                setItems((prev) => prev.filter((p) => p.title.toLowerCase() !== title.toLowerCase()))
                startTransition(async () => {
                  await onRemove(title)
                })
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border hover:bg-muted disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {!c.found && (
              <div className="text-xs font-semibold text-amber-700">Not found in Configuration table</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

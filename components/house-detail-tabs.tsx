"use client"

import * as React from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function HouseDetailTabs({
  overview,
  media,
  valuation,
  analytics,
}: {
  overview: React.ReactNode
  media: React.ReactNode
  valuation: React.ReactNode
  analytics: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get("tab") ?? "overview"

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        const next = new URLSearchParams(searchParams.toString())
        next.set("tab", v)
        router.replace(`${pathname}?${next.toString()}`, { scroll: false })
      }}
    >
      <TabsList className="bg-muted/60">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="valuation">Valuation</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6 space-y-6">
        {overview}
      </TabsContent>

      <TabsContent value="media" className="mt-6">
        {media}
      </TabsContent>

      <TabsContent value="valuation" className="mt-6 space-y-6">
        {valuation}
      </TabsContent>

      <TabsContent value="analytics" className="mt-6 space-y-6">
        {analytics}
      </TabsContent>
    </Tabs>
  )
}

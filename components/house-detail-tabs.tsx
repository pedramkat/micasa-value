"use client"

import * as React from "react"

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
  return (
    <Tabs defaultValue="overview">
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

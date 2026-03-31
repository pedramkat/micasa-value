"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Configuration {
  id: string;
  title: string;
  description?: string;
  fixValue?: number;
  variableValue?: number;
  properties?: any;
  propertyValuation: boolean;
  houseValuation: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dynamic = "force-dynamic";

export default function ConfigurationsPage() {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigurations();
  }, []);

  async function fetchConfigurations() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/configurations");
      if (!res.ok) throw new Error("Failed to fetch configurations");
      const data = await res.json();
      setConfigurations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteConfiguration(id: string) {
    if (!confirm("Are you sure you want to delete this configuration?")) return;

    try {
      const res = await fetch(`/api/configurations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete configuration");
      fetchConfigurations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage pricing and house valuation parameters.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/configurations/new">
            <Plus className="h-4 w-4" />
            New configuration
          </Link>
        </Button>
      </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 min-h-[220px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Loading...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-destructive">{error}</div>
            </CardContent>
          </Card>
        ) : configurations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Settings2 className="h-5 w-5" />
              </div>
              <div className="text-base font-semibold">No configurations available</div>
              <div className="mt-1 text-sm text-muted-foreground">Create your first configuration to tune valuations.</div>
              <div className="mt-5">
                <Button asChild className="gap-2">
                  <Link href="/configurations/new">
                    <Plus className="h-4 w-4" />
                    New configuration
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {configurations.map((config) => (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        <Link href={`/configurations/${config.id}`} className="hover:underline">
                          {config.title}
                        </Link>
                      </CardTitle>
                      {config.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{config.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/configurations/${config.id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteConfiguration(config.id)}
                        aria-label="Delete configuration"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {config.fixValue !== undefined && config.fixValue !== null && (
                      <div className="rounded-lg bg-muted/30 px-3.5 py-2.5">
                        <span className="text-muted-foreground">Fix Value</span>
                        <div className="font-semibold mt-0.5">%{config.fixValue}</div>
                      </div>
                    )}
                    {config.variableValue !== undefined && config.variableValue !== null && (
                      <div className="rounded-lg bg-muted/30 px-3.5 py-2.5">
                        <span className="text-muted-foreground">Variable Value</span>
                        <div className="font-semibold mt-0.5">%{config.variableValue}</div>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted/30 px-3.5 py-2.5">
                      <span className="text-muted-foreground">Property Valuation</span>
                      <div className="font-semibold mt-0.5">{config.propertyValuation ? "Yes" : "No"}</div>
                    </div>
                    <div className="rounded-lg bg-muted/30 px-3.5 py-2.5">
                      <span className="text-muted-foreground">House Valuation</span>
                      <div className="font-semibold mt-0.5">{config.houseValuation ? "Yes" : "No"}</div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Created: {new Date(config.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

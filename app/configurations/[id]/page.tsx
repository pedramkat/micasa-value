"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export default function EditConfiguration({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [configId, setConfigId] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fixValue, setFixValue] = useState("");
  const [variableValue, setVariableValue] = useState("");
  const [properties, setProperties] = useState("");
  const [propertyValuation, setPropertyValuation] = useState(false);
  const [houseValuation, setHouseValuation] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setConfigId(id);
      fetchConfiguration(id);
    });
  }, []);

  async function fetchConfiguration(id: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/configurations/${id}`);
      if (!res.ok) throw new Error("Failed to fetch configuration");
      const data = await res.json();
      setConfig(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setFixValue(data.fixValue?.toString() || "");
      setVariableValue(data.variableValue?.toString() || "");
      setProperties(data.properties ? JSON.stringify(data.properties, null, 2) : "");
      setPropertyValuation(data.propertyValuation);
      setHouseValuation(data.houseValuation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configId) return;

    setIsSaving(true);
    setError(null);

    try {
      let parsedProperties = null;
      if (properties.trim()) {
        parsedProperties = JSON.parse(properties);
      }

      const res = await fetch(`/api/configurations/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          fixValue: fixValue ? parseFloat(fixValue) : null,
          variableValue: variableValue ? parseFloat(variableValue) : null,
          properties: parsedProperties,
          propertyValuation,
          houseValuation,
        }),
      });

      if (!res.ok) throw new Error("Failed to update configuration");
      router.push("/configurations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[220px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="text-sm font-medium text-destructive">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/configurations" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Configurations
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">Edit</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Edit configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fixValue" className="text-sm font-medium">Fix Value (%)</label>
                <Input id="fixValue" type="number" value={fixValue} onChange={(e) => setFixValue(e.target.value)} step="0.01" />
              </div>
              <div className="space-y-2">
                <label htmlFor="variableValue" className="text-sm font-medium">Variable Value (%)</label>
                <Input id="variableValue" type="number" value={variableValue} onChange={(e) => setVariableValue(e.target.value)} step="0.01" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="properties" className="text-sm font-medium">Properties (JSON)</label>
              <Textarea
                id="properties"
                value={properties}
                onChange={(e) => setProperties(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  id="propertyValuation"
                  checked={propertyValuation}
                  onChange={(e) => setPropertyValuation(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Property Valuation
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  id="houseValuation"
                  checked={houseValuation}
                  onChange={(e) => setHouseValuation(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                House Valuation
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/configurations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

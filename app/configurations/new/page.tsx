"use client";

import Form from "next/form";
import { createConfiguration } from "./actions";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewConfiguration() {
  const [propertiesJson, setPropertiesJson] = useState("");

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/configurations" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Configurations
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Create configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form action={createConfiguration} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input id="title" name="title" required placeholder="Enter configuration title..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea id="description" name="description" placeholder="Enter configuration description..." rows={3} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fixValue" className="text-sm font-medium">
                  Fix Value (%)
                </label>
                <Input type="number" id="fixValue" name="fixValue" step="1" placeholder="0" />
              </div>

              <div className="space-y-2">
                <label htmlFor="variableValue" className="text-sm font-medium">
                  Variable Value (%)
                </label>
                <Input type="number" id="variableValue" name="variableValue" step="0.1" placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="properties" className="text-sm font-medium">
                Properties (JSON)
              </label>
              <Textarea
                id="properties"
                name="properties"
                value={propertiesJson}
                onChange={(e) => setPropertiesJson(e.target.value)}
                placeholder='{"key": "value"}'
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Enter valid JSON or leave empty.</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  id="propertyValuation"
                  name="propertyValuation"
                  className="h-4 w-4 rounded border-input"
                />
                Property Valuation
              </label>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  id="houseValuation"
                  name="houseValuation"
                  className="h-4 w-4 rounded border-input"
                />
                House Valuation
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/configurations">Cancel</Link>
              </Button>
              <Button type="submit">Create configuration</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

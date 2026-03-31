"use client";

import Form from "next/form";
import { createHouse } from "./actions";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewHouse() {
  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/houses" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Houses
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Create new house
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form action={createHouse} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input id="title" name="title" required placeholder="Enter house title..." />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea id="description" name="description" placeholder="Write a short description..." rows={6} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/houses">Cancel</Link>
              </Button>
              <Button type="submit">Create house</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

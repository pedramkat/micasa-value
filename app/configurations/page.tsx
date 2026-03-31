"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";

interface ConfigurationItem {
  id: string;
  title: string;
  description: string | null;
  fixValue: number | null;
  variableValue: number | null;
  properties: any;
  propertyValuation: boolean;
  houseValuation: boolean;
}

type ConfigurationRow = ConfigurationItem;

export const dynamic = "force-dynamic";

export default function Configuration() {
  const [parameters, setParameters] = useState<ConfigurationItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ConfigurationItem | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFixValue, setFormFixValue] = useState("");
  const [formVariableValue, setFormVariableValue] = useState("");
  const [formPropertiesJson, setFormPropertiesJson] = useState("");
  const [formPropertyValuation, setFormPropertyValuation] = useState(false);
  const [formHouseValuation, setFormHouseValuation] = useState(false);

  useEffect(() => {
    void fetchParameters();
  }, []);

  async function fetchParameters() {
    try {
      const res = await fetch("/api/configurations");
      if (!res.ok) throw new Error("Failed to fetch configurations");
      const rows = (await res.json()) as ConfigurationRow[];
      const normalized = rows.map((r) => {
        const fixValueRaw: any = (r as any).fixValue;
        const variableValueRaw: any = (r as any).variableValue;

        const fixValueNum = fixValueRaw === null || fixValueRaw === undefined || fixValueRaw === "" ? null : Number(fixValueRaw);
        const variableValueNum =
          variableValueRaw === null || variableValueRaw === undefined || variableValueRaw === "" ? null : Number(variableValueRaw);

        return {
          ...r,
          fixValue: fixValueNum === null || Number.isNaN(fixValueNum) ? null : fixValueNum,
          variableValue: variableValueNum === null || Number.isNaN(variableValueNum) ? null : variableValueNum,
        } as ConfigurationItem;
      });
      setParameters(normalized);
    } catch (e: any) {
      toast.error("Failed to load parameters", { description: e?.message ?? "Unknown error" });
    }
  }

  const openAdd = () => {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormFixValue("");
    setFormVariableValue("");
    setFormPropertiesJson("");
    setFormPropertyValuation(false);
    setFormHouseValuation(false);
    setDialogOpen(true);
  };

  const openEdit = (p: ConfigurationItem) => {
    setEditing(p);
    setFormTitle(p.title);
    setFormDescription(p.description ?? "");
    setFormFixValue(p.fixValue === null || p.fixValue === undefined ? "" : String(p.fixValue));
    setFormVariableValue(p.variableValue === null || p.variableValue === undefined ? "" : String(p.variableValue));
    setFormPropertiesJson(p.properties ? JSON.stringify(p.properties, null, 2) : "");
    setFormPropertyValuation(!!p.propertyValuation);
    setFormHouseValuation(!!p.houseValuation);
    setDialogOpen(true);
  };

  async function handleSave() {
    const trimmed = formTitle.trim();
    if (!trimmed) {
      toast.error("Il nome del parametro è obbligatorio.");
      return;
    }

    const fixValue = formFixValue.trim() ? Number.parseFloat(formFixValue) : null;
    if (formFixValue.trim() && !Number.isFinite(fixValue)) {
      toast.error("Inserisci un Fix Value numerico valido.");
      return;
    }

    const variableValue = formVariableValue.trim() ? Number.parseFloat(formVariableValue) : null;
    if (formVariableValue.trim() && !Number.isFinite(variableValue)) {
      toast.error("Inserisci un Variable Value numerico valido.");
      return;
    }

    let properties: any = null;
    if (formPropertiesJson.trim()) {
      try {
        properties = JSON.parse(formPropertiesJson);
      } catch {
        toast.error("Properties deve essere JSON valido.");
        return;
      }
    }

    try {
      if (editing) {
        const res = await fetch(`/api/configurations/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed,
            description: formDescription.trim() ? formDescription.trim() : null,
            fixValue,
            variableValue,
            properties,
            propertyValuation: formPropertyValuation,
            houseValuation: formHouseValuation,
          }),
        });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error ?? "Failed to update");

        toast.success(`Parametro "${trimmed}" aggiornato.`);
      } else {
        const res = await fetch("/api/configurations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed,
            description: formDescription.trim() ? formDescription.trim() : null,
            fixValue,
            variableValue,
            properties,
            propertyValuation: formPropertyValuation,
            houseValuation: formHouseValuation,
          }),
        });
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data?.error ?? "Failed to create");

        toast.success(`Parametro "${trimmed}" aggiunto.`);
      }

      setDialogOpen(false);
      await fetchParameters();
    } catch (e: any) {
      toast.error("Salvataggio fallito", { description: e?.message ?? "Unknown error" });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const param = parameters.find((p) => p.id === deleteId);
    try {
      const res = await fetch(`/api/configurations/${deleteId}`, { method: "DELETE" });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete");
      toast.success(`Parametro "${param?.title}" eliminato.`);
      setDeleteId(null);
      await fetchParameters();
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message ?? "Unknown error" });
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Configurazione
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestisci i parametri di prezzo utilizzati nelle valutazioni immobiliari.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Parametri di Prezzo</CardTitle>
            <CardDescription>
              Coefficienti applicati al calcolo della valutazione. Ogni parametro moltiplica il valore base €/mq.
            </CardDescription>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Parametro</TableHead>
                  <TableHead className="text-center">Valore</TableHead>
                  <TableHead className="text-right w-[120px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nessun parametro configurato. Clicca "Aggiungi" per iniziare.
                    </TableCell>
                  </TableRow>
                )}
                {parameters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-center tabular-nums font-mono">{p.fixValue === null ? "-" : p.fixValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifica Parametro" : "Nuovo Parametro"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Aggiorna i campi della configurazione."
                : "Aggiungi un nuovo parametro di configurazione."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="param-title">Nome parametro</Label>
              <Input
                id="param-title"
                placeholder="es. Stato locativo"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="param-description">Descrizione</Label>
              <Textarea
                id="param-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="param-fixValue">Fix Value (%)</Label>
                <Input
                  id="param-fixValue"
                  type="number"
                  step="1"
                  placeholder="0"
                  value={formFixValue}
                  onChange={(e) => setFormFixValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="param-variableValue">Variable Value (%)</Label>
                <Input
                  id="param-variableValue"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={formVariableValue}
                  onChange={(e) => setFormVariableValue(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="param-properties">Properties (JSON)</Label>
              <Textarea
                id="param-properties"
                value={formPropertiesJson}
                onChange={(e) => setFormPropertiesJson(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Property Valuation</div>
                </div>
                <Switch
                  checked={formPropertyValuation}
                  onCheckedChange={setFormPropertyValuation}
                  className="data-[state=unchecked]:bg-muted-foreground/30 data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">House Valuation</div>
                </div>
                <Switch
                  checked={formHouseValuation}
                  onCheckedChange={setFormHouseValuation}
                  className="data-[state=unchecked]:bg-muted-foreground/30 data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editing ? "Aggiorna" : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo parametro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il parametro verrà rimosso dalla configurazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

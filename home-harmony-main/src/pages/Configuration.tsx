import { useState } from "react";
import { Plus, Pencil, Trash2, Save, X, SlidersHorizontal, Database, UserPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PriceParameter {
  id: string;
  title: string;
  value: number;
  source: "DB" | "Manual";
}

const initialParams: PriceParameter[] = [
  { id: "pp-1", title: "Stato locativo", value: 1.0, source: "DB" },
  { id: "pp-2", title: "Livello piano", value: 0.95, source: "DB" },
  { id: "pp-3", title: "Stato conservativo", value: 1.05, source: "DB" },
];

export default function Configuration() {
  const [parameters, setParameters] = useState<PriceParameter[]>(initialParams);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PriceParameter | null>(null);

  // form state
  const [formTitle, setFormTitle] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formSource, setFormSource] = useState<"DB" | "Manual">("DB");

  const openAdd = () => {
    setEditing(null);
    setFormTitle("");
    setFormValue("");
    setFormSource("DB");
    setDialogOpen(true);
  };

  const openEdit = (p: PriceParameter) => {
    setEditing(p);
    setFormTitle(p.title);
    setFormValue(String(p.value));
    setFormSource(p.source);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const trimmed = formTitle.trim();
    const num = parseFloat(formValue);
    if (!trimmed) {
      toast.error("Il nome del parametro è obbligatorio.");
      return;
    }
    if (isNaN(num)) {
      toast.error("Inserisci un valore numerico valido.");
      return;
    }

    if (editing) {
      setParameters((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? { ...p, title: trimmed, value: num, source: formSource }
            : p
        )
      );
      toast.success(`Parametro "${trimmed}" aggiornato.`);
    } else {
      const newParam: PriceParameter = {
        id: `pp-${Date.now()}`,
        title: trimmed,
        value: num,
        source: formSource,
      };
      setParameters((prev) => [...prev, newParam]);
      toast.success(`Parametro "${trimmed}" aggiunto.`);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const param = parameters.find((p) => p.id === deleteId);
    setParameters((prev) => prev.filter((p) => p.id !== deleteId));
    toast.success(`Parametro "${param?.title}" eliminato.`);
    setDeleteId(null);
  };

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

      {/* Price Parameters */}
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
                  <TableHead className="text-center">Sorgente</TableHead>
                  <TableHead className="text-right w-[120px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parameters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nessun parametro configurato. Clicca "Aggiungi" per iniziare.
                    </TableCell>
                  </TableRow>
                )}
                {parameters.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-center tabular-nums font-mono">
                      {p.value.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={p.source === "DB" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {p.source === "DB" ? (
                          <Database className="h-3 w-3" />
                        ) : (
                          <UserPen className="h-3 w-3" />
                        )}
                        {p.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(p)}
                        >
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

          {parameters.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Coefficiente complessivo</span>
              <span className="font-mono font-semibold">
                {parameters.reduce((acc, p) => acc * p.value, 1).toFixed(4)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica Parametro" : "Nuovo Parametro"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Aggiorna il nome, valore o sorgente del parametro."
                : "Aggiungi un nuovo coefficiente di prezzo alla configurazione."}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="param-value">Valore (coefficiente)</Label>
                <Input
                  id="param-value"
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sorgente</Label>
                <Select value={formSource} onValueChange={(v) => setFormSource(v as "DB" | "Manual")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DB">
                      <span className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5" /> DB
                      </span>
                    </SelectItem>
                    <SelectItem value="Manual">
                      <span className="flex items-center gap-2">
                        <UserPen className="h-3.5 w-3.5" /> Manuale
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

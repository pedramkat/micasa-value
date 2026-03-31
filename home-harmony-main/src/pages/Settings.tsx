import { useState } from "react";
import { Save, User, Bell, Globe, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Settings() {
  const [profile, setProfile] = useState({
    name: "Marco Rossi",
    email: "marco@micasa.it",
    phone: "+39 333 1234567",
    company: "MiCasa Valutazioni",
    bio: "Agente immobiliare con 15 anni di esperienza nel mercato toscano.",
  });

  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    telegramSync: true,
    valuationAlerts: true,
    weeklyReport: false,
  });

  const handleSave = () => {
    toast.success("Impostazioni salvate con successo");
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci il tuo profilo e le preferenze dell'applicazione.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profilo
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifiche
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            Generali
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informazioni Personali</CardTitle>
              <CardDescription>Aggiorna i dati del tuo profilo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  MR
                </div>
                <div>
                  <Button variant="outline" size="sm">Cambia foto</Button>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 2MB.</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Azienda</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Sicurezza
              </CardTitle>
              <CardDescription>Gestisci password e autenticazione.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-pw">Password attuale</Label>
                  <Input id="current-pw" type="password" placeholder="••••••••" />
                </div>
                <div />
                <div className="space-y-2">
                  <Label htmlFor="new-pw">Nuova password</Label>
                  <Input id="new-pw" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Conferma password</Label>
                  <Input id="confirm-pw" type="password" placeholder="••••••••" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferenze Notifiche</CardTitle>
              <CardDescription>Scegli quali notifiche ricevere.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "emailUpdates" as const, label: "Aggiornamenti via email", desc: "Ricevi aggiornamenti sulle valutazioni completate." },
                { key: "telegramSync" as const, label: "Sincronizzazione Telegram", desc: "Notifiche quando nuove foto vengono importate da Telegram." },
                { key: "valuationAlerts" as const, label: "Avvisi valutazione", desc: "Notifica quando una valutazione è pronta per il download." },
                { key: "weeklyReport" as const, label: "Report settimanale", desc: "Ricevi un riepilogo settimanale via email." },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Preferenze Applicazione
              </CardTitle>
              <CardDescription>Personalizza l'esperienza dell'app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lingua</Label>
                  <Select defaultValue="it">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="it">Italiano</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valuta</Label>
                  <Select defaultValue="eur">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato data</Label>
                  <Select defaultValue="dd-mm-yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unità di misura</Label>
                  <Select defaultValue="mq">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mq">Metri quadri (mq)</SelectItem>
                      <SelectItem value="sqft">Square feet (sqft)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API & Integrazioni</CardTitle>
              <CardDescription>Gestisci le chiavi API e le integrazioni esterne.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input id="openai-key" type="password" placeholder="sk-••••••••••••••••" />
                <p className="text-xs text-muted-foreground">Utilizzata per il miglioramento foto e narrativa AI.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                <Input id="telegram-token" type="password" placeholder="••••••••:•••••••••••••••••••" />
                <p className="text-xs text-muted-foreground">Token del bot per l'importazione automatica delle foto.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salva impostazioni
        </Button>
      </div>
    </div>
  );
}

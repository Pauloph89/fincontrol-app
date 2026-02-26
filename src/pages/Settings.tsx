import { useState, useEffect, useRef } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, Upload, Palette, Save, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Settings() {
  const { settingsQuery, updateSettings, uploadLogo } = useCompanySettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    company_name: "",
    cnpj: "",
    responsible_name: "",
    email: "",
    phone: "",
    primary_color: "#1e3a5f",
    secondary_color: "#2563eb",
    default_account: "cnpj",
    currency: "BRL",
    financial_day_start: 1,
    alert_days: 3,
  });

  const settings = settingsQuery.data;

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        cnpj: (settings as any).cnpj || "",
        responsible_name: (settings as any).responsible_name || "",
        email: (settings as any).email || "",
        phone: (settings as any).phone || "",
        primary_color: settings.primary_color || "#1e3a5f",
        secondary_color: settings.secondary_color || "#2563eb",
        default_account: (settings as any).default_account || "cnpj",
        currency: (settings as any).currency || "BRL",
        financial_day_start: (settings as any).financial_day_start || 1,
        alert_days: (settings as any).alert_days || 3,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(form as any);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadLogo.mutateAsync(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Personalize seu sistema financeiro</p>
      </div>

      {/* Company Identity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Identidade da Empresa
          </CardTitle>
          <CardDescription>Informações que aparecem no sistema e relatórios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              {settings?.company_logo_url ? (
                <img
                  src={settings.company_logo_url}
                  alt="Logo"
                  className="h-20 w-20 rounded-lg object-contain border border-border bg-background p-1"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Logomarca</p>
              <p className="text-xs text-muted-foreground">PNG ou JPG, máximo 2MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadLogo.isPending}>
                {uploadLogo.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                {uploadLogo.isPending ? "Enviando..." : "Enviar Logo"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} placeholder="Minha Empresa Ltda" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => setForm((p) => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input value={form.responsible_name} onChange={(e) => setForm((p) => ({ ...p, responsible_name: e.target.value }))} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
          </div>

          <Separator />

          {/* Colors */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Label>Cores do Sistema</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded border border-border"
                  />
                  <Input value={form.primary_color} onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondary_color}
                    onChange={(e) => setForm((p) => ({ ...p, secondary_color: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded border border-border"
                  />
                  <Input value={form.secondary_color} onChange={(e) => setForm((p) => ({ ...p, secondary_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            {/* Preview */}
            <div className="mt-3 rounded-lg p-4 border border-border" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}>
              <p className="text-white text-sm font-semibold">{form.company_name || "Preview do Sistema"}</p>
              <p className="text-white/70 text-xs">Visualização em tempo real das cores</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Configurações Financeiras</CardTitle>
          <CardDescription>Padrões para o sistema financeiro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="cursor-help underline decoration-dotted">Conta Padrão</Label>
                </TooltipTrigger>
                <TooltipContent>Conta utilizada por padrão ao cadastrar despesas</TooltipContent>
              </Tooltip>
              <Select value={form.default_account} onValueChange={(v) => setForm((p) => ({ ...p, default_account: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL (R$)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="cursor-help underline decoration-dotted">Dia Inicial do Mês Financeiro</Label>
                </TooltipTrigger>
                <TooltipContent>Dia do mês em que seu ciclo financeiro começa</TooltipContent>
              </Tooltip>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.financial_day_start}
                onChange={(e) => setForm((p) => ({ ...p, financial_day_start: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className="cursor-help underline decoration-dotted">Alerta de Vencimento (dias)</Label>
                </TooltipTrigger>
                <TooltipContent>Número de dias úteis antes do vencimento para gerar alertas</TooltipContent>
              </Tooltip>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.alert_days}
                onChange={(e) => setForm((p) => ({ ...p, alert_days: parseInt(e.target.value) || 3 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Salvar Configurações</>
        )}
      </Button>
    </div>
  );
}

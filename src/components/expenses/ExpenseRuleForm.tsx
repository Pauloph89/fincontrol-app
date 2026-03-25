import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, PlusCircle } from "lucide-react";
import { useExpenseRules, ExpenseRuleFormData } from "@/hooks/useExpenseRules";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";

export function ExpenseRuleForm() {
  const [open, setOpen] = useState(false);
  const { createRule } = useExpenseRules();
  const { allCategories, createCategory } = useExpenseCategories();
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [daysInput, setDaysInput] = useState("5");
  const [form, setForm] = useState<ExpenseRuleFormData>({
    name: "",
    category: "",
    value: 0,
    account: "cnpj",
    recurrence_type: "mensal",
    recurrence_days: [5],
    start_date: new Date().toISOString().split("T")[0],
  });

  const handleRecurrenceTypeChange = (type: string) => {
    setForm((p) => ({ ...p, recurrence_type: type }));
    if (type === "mensal") setDaysInput("5");
    else if (type === "quinzenal") setDaysInput("5, 20");
    else if (type === "trimestral") setDaysInput("5");
    else if (type === "anual") setDaysInput("5");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = daysInput.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d) && d >= 1 && d <= 31);
    if (days.length === 0) return;
    await createRule.mutateAsync({ ...form, recurrence_days: days });
    setOpen(false);
    setForm({ name: "", category: "", value: 0, account: "cnpj", recurrence_type: "mensal", recurrence_days: [5], start_date: new Date().toISOString().split("T")[0] });
    setDaysInput("5");
  };

  const handleCreateCategory = async () => {
    if (!newCat.trim()) return;
    await createCategory.mutateAsync(newCat.trim());
    setForm((p) => ({ ...p, category: newCat.trim() }));
    setNewCat("");
    setShowNewCat(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Nova Recorrência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Regra de Despesa Recorrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={(form as any).type || "fixa"} onValueChange={(v) => setForm((p) => ({ ...p, type: v } as any))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome / Descrição *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Aluguel escritório" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input type="number" step="0.01" min="0" value={form.value || ""} onChange={(e) => setForm((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))} required />
            </div>
            <div className="space-y-2">
              <Label>Conta *</Label>
              <Select value={form.account} onValueChange={(v) => setForm((p) => ({ ...p, account: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Categoria *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowNewCat(!showNewCat)}>
                <PlusCircle className="mr-1 h-3 w-3" /> Nova
              </Button>
            </div>
            {showNewCat && (
              <div className="flex gap-2">
                <Input placeholder="Nome da categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} className="h-8 text-sm" />
                <Button type="button" size="sm" className="h-8" onClick={handleCreateCategory}>Criar</Button>
              </div>
            )}
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recorrência *</Label>
              <Select value={form.recurrence_type} onValueChange={handleRecurrenceTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dias do mês *</Label>
              <Input
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                placeholder="Ex: 5, 20"
              />
              <p className="text-[10px] text-muted-foreground">
                {form.recurrence_type === "quinzenal" ? "Dois dias (ex: 5, 20)" : "Dia(s) do vencimento"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data início *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Data fim (opcional)</Label>
              <Input type="date" value={form.end_date || ""} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value || undefined }))} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createRule.isPending}>
            {createRule.isPending ? "Salvando..." : "Criar Regra Recorrente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, PlusCircle } from "lucide-react";
import { useExpenses, ExpenseFormData } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const { createExpense } = useExpenses();
  const { allCategories, createCategory } = useExpenseCategories();
  const [newCat, setNewCat] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>({
    type: "variavel",
    category: "",
    description: "",
    value: 0,
    account: "cnpj",
    due_date: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createExpense.mutateAsync(form);
    setOpen(false);
    setForm({
      type: "variavel", category: "", description: "", value: 0,
      account: "cnpj", due_date: new Date().toISOString().split("T")[0],
    });
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa</SelectItem>
                  <SelectItem value="variavel">Variável</SelectItem>
                </SelectContent>
              </Select>
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
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input type="number" step="0.01" min="0" value={form.value || ""} onChange={(e) => setForm((p) => ({ ...p, value: parseFloat(e.target.value) || 0 }))} required />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data de Pagamento (se já pago)</Label>
            <Input type="date" value={form.payment_date || ""} onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value || undefined }))} />
          </div>
          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={form.recurrence || "none"} onValueChange={(v) => setForm((p) => ({ ...p, recurrence: v === "none" ? undefined : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem recorrência</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.recurrence && (
            <div className="space-y-2">
              <Label>Até quando? (opcional — padrão: 1 ano)</Label>
              <Input type="date" value={form.recurrence_end_date || ""} onChange={(e) => setForm((p) => ({ ...p, recurrence_end_date: e.target.value || undefined }))} />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={createExpense.isPending}>
            {createExpense.isPending ? "Salvando..." : "Cadastrar Despesa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useExpenses, ExpenseFormData } from "@/hooks/useExpenses";

const categories = [
  "Combustível", "Alimentação", "Hospedagem", "Telefone", "Internet",
  "Material de Escritório", "Aluguel", "Impostos", "Marketing", "Outros"
];

export function ExpenseForm() {
  const [open, setOpen] = useState(false);
  const { createExpense } = useExpenses();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
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
            <Label>Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
          <Button type="submit" className="w-full" disabled={createExpense.isPending}>
            {createExpense.isPending ? "Salvando..." : "Cadastrar Despesa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FileUp, Loader2 } from "lucide-react";
import { useExpenses, ExpenseFormData } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ExpensePdfImport() {
  const [open, setOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const { createExpense } = useExpenses();
  const { allCategories } = useExpenseCategories();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ExpenseFormData>({
    type: "variavel",
    category: "",
    description: "",
    value: 0,
    account: "cnpj",
    due_date: new Date().toISOString().split("T")[0],
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "expense");

      const { data: fnData, error } = await supabase.functions.invoke("extract-pdf-order", {
        body: formData,
      });

      if (error) throw error;

      // Try to extract expense data from the AI response
      const expense = fnData?.expense || fnData?.orders?.[0] || fnData;
      const description = expense?.description || expense?.client || file.name.replace(".pdf", "");
      const value = parseFloat(expense?.value || expense?.commission_base_value || expense?.invoice_total_value || 0);
      const dueDate = expense?.due_date || expense?.billing_date || expense?.order_date || new Date().toISOString().split("T")[0];

      // Suggest category based on description keywords
      let suggestedCategory = "";
      const descLower = (description || "").toLowerCase();
      if (descLower.includes("aluguel")) suggestedCategory = "Aluguel";
      else if (descLower.includes("energia") || descLower.includes("luz")) suggestedCategory = "Energia";
      else if (descLower.includes("telefone") || descLower.includes("internet")) suggestedCategory = "Telecom";
      else if (descLower.includes("combustível") || descLower.includes("gasolina")) suggestedCategory = "Combustível";
      else if (allCategories.length > 0) suggestedCategory = allCategories[0];

      setForm({
        type: "variavel",
        category: suggestedCategory,
        description: String(description),
        value: isNaN(value) ? 0 : value,
        account: "cnpj",
        due_date: dueDate,
      });
      setExtracted(true);
    } catch (err: any) {
      toast({ title: "Erro ao processar PDF", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || form.value <= 0) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    await createExpense.mutateAsync(form);
    setOpen(false);
    setExtracted(false);
    setForm({ type: "variavel", category: "", description: "", value: 0, account: "cnpj", due_date: new Date().toISOString().split("T")[0] });
    toast({ title: "Despesa importada com sucesso!" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setExtracted(false); } }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Despesa de PDF</DialogTitle>
        </DialogHeader>

        {!extracted ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Faça upload de um PDF e o sistema extrairá automaticamente os dados da despesa para revisão.
            </p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            <Button variant="outline" className="w-full h-24 border-dashed" onClick={() => fileRef.current?.click()} disabled={extracting}>
              {extracting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processando PDF...</>
              ) : (
                <><FileUp className="mr-2 h-5 w-5" />Selecionar PDF</>
              )}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              ⚠️ Revise os dados extraídos antes de salvar. Ajuste o que for necessário.
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input type="number" step="0.01" min="0" value={form.value || ""} onChange={(e) => setForm(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm(p => ({ ...p, due_date: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixa">Fixa</SelectItem>
                    <SelectItem value="variavel">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Select value={form.account} onValueChange={(v) => setForm(p => ({ ...p, account: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExtracted(false)}>Voltar</Button>
              <Button type="submit" disabled={createExpense.isPending || form.value <= 0}>
                {createExpense.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Despesa
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

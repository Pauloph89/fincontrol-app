import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { FileUp, Loader2 } from "lucide-react";
import { useExpenses, ExpenseFormData } from "@/hooks/useExpenses";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdf-extract";

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
      // Step 1: Extract text from PDF in the browser
      const pdfText = await extractTextFromPdf(file);

      if (!pdfText || pdfText.trim().length < 10) {
        toast({ title: "PDF sem texto legível", description: "O PDF pode ser uma imagem escaneada. Tente um PDF com texto selecionável.", variant: "destructive" });
        setExtracting(false);
        return;
      }

      // Step 2: Parse text client-side using regex
      const parsed = parseExpenseText(pdfText, file.name);
      const description = parsed.description;
      const value = parsed.value;
      const dueDate = parsed.dueDate;
      const suggestedCategory = parsed.category || (allCategories.length > 0 ? allCategories[0] : "");

      // Match suggested category to existing categories
      let matchedCategory = suggestedCategory;
      if (allCategories.length > 0) {
        const found = allCategories.find(
          (c) => c.toLowerCase() === suggestedCategory.toLowerCase()
        );
        matchedCategory = found || allCategories[0];
      }

      setForm({
        type: "variavel",
        category: matchedCategory,
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
              Faça upload de um PDF (boleto, fatura, conta) e o sistema extrairá automaticamente os dados para revisão.
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

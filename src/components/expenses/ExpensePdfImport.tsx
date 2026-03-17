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

const PDFJS_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Impostos: ["imposto", "darf", "gps", "iss", "cofins", "pis", "inss"],
  Internet: ["internet", "telefone", "banda larga"],
  "Combustível": ["combustível", "combustivel", "posto", "gasolina"],
  "Alimentação": ["alimentação", "alimentacao", "restaurante", "lanche", "café", "cafe"],
};

type PdfJsTextItem = {
  str?: string;
};

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (source: { data: Uint8Array }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNumber: number) => Promise<{
            getTextContent: () => Promise<{ items: PdfJsTextItem[] }>;
          }>;
        }>;
      };
    };
  }
}

function getDefaultForm(description = ""): ExpenseFormData {
  return {
    type: "variavel",
    category: "",
    description,
    value: 0,
    account: "cnpj",
    due_date: "",
  };
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim();
}

function parseCurrencyValue(rawValue: string) {
  const normalized = rawValue.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateToIso(dateValue: string) {
  const match = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";

  const [, day, month, year] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    candidate.getFullYear() !== Number(year) ||
    candidate.getMonth() !== Number(month) - 1 ||
    candidate.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function extractLargestValue(text: string): number {
  const matches: string[] = text.match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}|R\$\s*\d+,\d{2}/g) ?? [];

  return matches.reduce<number>((largest, match) => {
    const value = parseCurrencyValue(match.replace(/R\$\s*/i, ""));
    return value > largest ? value : largest;
  }, 0);
}

function extractFutureDueDate(text: string) {
  const matches = text.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? [];
  const validDates = matches
    .map(parseDateToIso)
    .filter(Boolean)
    .sort((a, b) => {
      const [yearA, monthA, dayA] = a.split("-").map(Number);
      const [yearB, monthB, dayB] = b.split("-").map(Number);
      return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
    });

  return validDates[0] ?? "";
}

function suggestCategory(text: string) {
  const normalized = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }

  return normalized.trim() ? "Outros" : "";
}

function parseExpenseText(text: string, fileName: string): {
  description: string;
  value: number;
  dueDate: string;
  category: string;
} {
  return {
    description: getFileBaseName(fileName),
    value: extractLargestValue(text),
    dueDate: extractFutureDueDate(text),
    category: suggestCategory(text),
  };
}

async function loadPdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return window.pdfjsLib;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-pdfjs-cdn="${PDFJS_CDN_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Falha ao carregar o leitor de PDF.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_CDN_URL;
    script.async = true;
    script.dataset.pdfjsCdn = PDFJS_CDN_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o leitor de PDF."));
    document.body.appendChild(script);
  });

  if (!window.pdfjsLib) {
    throw new Error("Biblioteca de PDF indisponível.");
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  return window.pdfjsLib;
}

async function extractPdfTextClientSide(file: File) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => item.str?.trim() ?? "")
      .filter(Boolean)
      .join(" ");

    pages.push(pageText);
  }

  return pages.join("\n").replace(/\s+/g, " ").trim();
}

export function ExpensePdfImport() {
  const [open, setOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const { createExpense } = useExpenses();
  const { allCategories } = useExpenseCategories();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ExpenseFormData>(() => getDefaultForm());

  const resetForm = () => {
    setExtracted(false);
    setForm(getDefaultForm());
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);

    try {
      const pdfText = await extractPdfTextClientSide(file);
      const parsed = parseExpenseText(pdfText, file.name);
      const matchedCategory = allCategories.find((category) => category.toLowerCase() === parsed.category.toLowerCase()) ?? "";

      setForm({
        type: "variavel",
        category: matchedCategory,
        description: parsed.description,
        value: parsed.value,
        account: "cnpj",
        due_date: parsed.dueDate,
      });

      setExtracted(true);

      if (!pdfText) {
        toast({
          title: "Texto não identificado no PDF",
          description: "Preencha manualmente os campos que não foram extraídos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      setForm(getDefaultForm(getFileBaseName(file.name)));
      setExtracted(true);
      toast({
        title: "Não foi possível extrair todos os dados",
        description: "Você pode preencher os campos manualmente antes de salvar.",
        variant: "destructive",
      });
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.description || form.value <= 0 || !form.due_date) {
      toast({
        title: "Revise os campos obrigatórios",
        description: "Preencha descrição, valor e vencimento antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    await createExpense.mutateAsync(form);
    setOpen(false);
    resetForm();
    toast({ title: "Despesa importada com sucesso!" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
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
              Faça upload de um PDF e os dados serão extraídos no navegador para revisão antes de salvar.
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
              ⚠️ Revise os dados extraídos antes de salvar. Ajuste manualmente qualquer campo em branco.
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, value: Number.parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
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
              <Select value={form.account} onValueChange={(value) => setForm((prev) => ({ ...prev, account: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>Voltar</Button>
              <Button type="submit" disabled={createExpense.isPending || form.value <= 0 || !form.description || !form.due_date}>
                {createExpense.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar e salvar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

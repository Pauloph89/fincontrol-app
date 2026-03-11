import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/financial-utils";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installment: { id: string; value: number; installment_number: number } | null;
  onConfirm: (data: { id: string; paid_date: string; paid_value: number; observation: string }) => void;
  isPending?: boolean;
}

export function ReceiptDialog({ open, onOpenChange, installment, onConfirm, isPending }: ReceiptDialogProps) {
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidValue, setPaidValue] = useState("");
  const [observation, setObservation] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && installment) {
      setPaidDate(new Date().toISOString().split("T")[0]);
      setPaidValue(String(installment.value));
      setObservation("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    if (!installment) return;
    onConfirm({
      id: installment.id,
      paid_date: paidDate,
      paid_value: parseFloat(paidValue) || installment.value,
      observation,
    });
  };

  if (!installment) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento — Parcela {installment.installment_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Valor previsto: <strong>{formatCurrency(installment.value)}</strong>
          </div>
          <div className="space-y-2">
            <Label>Data do Recebimento *</Label>
            <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor Recebido *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={paidValue}
              onChange={(e) => setPaidValue(e.target.value)}
              placeholder={String(installment.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
              placeholder="Ex: Recebido via transferência bancária"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !paidDate}>
            {isPending ? "Salvando..." : "Confirmar Recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

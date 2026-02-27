import { differenceInBusinessDays, isBefore, startOfDay } from "date-fns";

export function getInstallmentAlertClass(dueDate: string, status: string): string {
  if (status === "recebido") return "status-recebido";
  if (status === "cancelado") return "status-cancelado";
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  if (isBefore(due, today)) return "status-atrasado";
  const bizDays = differenceInBusinessDays(due, today);
  if (bizDays <= 3) return "status-vencendo";
  return "status-previsto";
}

export function getExpenseAlertClass(dueDate: string, status: string): string {
  if (status === "pago") return "status-pago";
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  if (isBefore(due, today)) return "status-vencido";
  const bizDays = differenceInBusinessDays(due, today);
  if (bizDays <= 3) return "status-vencendo";
  return "status-a_vencer";
}

export function getInstallmentStatus(dueDate: string, currentStatus: string): string {
  if (currentStatus === "recebido") return "recebido";
  if (currentStatus === "cancelado") return "cancelado";
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  if (isBefore(due, today)) return "atrasado";
  return "previsto";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export const statusLabels: Record<string, string> = {
  previsto: "Previsto",
  recebido: "Recebido",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  pago: "Pago",
  a_vencer: "A vencer",
  vencendo: "Vencendo",
  vencido: "Vencido",
  ativa: "Ativa",
  cancelada: "Cancelada",
  deleted: "Excluída",
  reactivate: "Reativada",
  // Commission lifecycle statuses
  pedido_enviado: "Pedido Enviado",
  faturado: "Faturado",
  entregue: "Entregue",
  comissao_aprovada: "Comissão Aprovada",
};

export const commissionStatusFlow = [
  { value: "pedido_enviado", label: "Pedido Enviado" },
  { value: "faturado", label: "Faturado" },
  { value: "entregue", label: "Entregue" },
  { value: "comissao_aprovada", label: "Comissão Aprovada" },
  { value: "ativa", label: "Ativa" },
  { value: "cancelada", label: "Cancelada" },
];

export const recurrenceLabels: Record<string, string> = {
  mensal: "Mensal",
  quinzenal: "Quinzenal",
  semanal: "Semanal",
  trimestral: "Trimestral",
  anual: "Anual",
  personalizado: "Personalizado",
};

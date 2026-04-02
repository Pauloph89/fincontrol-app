import { addMonths, endOfMonth, format, isBefore, parseISO, startOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type InstallmentStatus = string | null | undefined;

interface CommissionInstallmentLike {
  id?: string;
  installment_number?: number;
  value: number | string;
  due_date: string;
  paid_date?: string | null;
  status?: InstallmentStatus;
  notes?: string | null;
  receipt_url?: string | null;
  paid_observation?: string | null;
}

interface CommissionWithInstallmentsLike {
  factory?: string | null;
  client?: string | null;
  order_number?: string | null;
  commission_installments?: CommissionInstallmentLike[] | null;
}

export interface CommissionInstallmentEntry extends CommissionInstallmentLike {
  factory?: string | null;
  client?: string | null;
  order_number?: string | null;
}

export interface CommissionMonthlyPoint {
  key: string;
  label: string;
  recebido: number;
  previsto: number;
  atrasado: number;
  total: number;
}

interface MonthlySeriesOptions {
  labelMode?: "numeric" | "short-pt";
  monthsBack: number;
  monthsForward: number;
  referenceDate?: Date;
}

export function parseDateOnly(value: string): Date {
  return startOfDay(parseISO(value));
}

export function isActiveInstallmentStatus(status: InstallmentStatus): boolean {
  return status !== "cancelado" && status !== "deleted";
}

export function flattenActiveCommissionInstallments(
  commissions: CommissionWithInstallmentsLike[],
  factoryFilter = "all"
): CommissionInstallmentEntry[] {
  return commissions.flatMap((commission) =>
    (commission.commission_installments || [])
      .filter((installment) => isActiveInstallmentStatus(installment.status))
      .map((installment) => ({
        ...installment,
        factory: commission.factory,
        client: commission.client,
        order_number: commission.order_number,
      }))
      .filter((installment) => factoryFilter === "all" || installment.factory === factoryFilter)
  );
}

function createSeriesPoint(monthStart: Date, labelMode: MonthlySeriesOptions["labelMode"]): CommissionMonthlyPoint {
  return {
    key: format(monthStart, "yyyy-MM"),
    label: labelMode === "short-pt"
      ? format(monthStart, "MMM/yy", { locale: ptBR })
      : format(monthStart, "MM/yyyy"),
    recebido: 0,
    previsto: 0,
    atrasado: 0,
    total: 0,
  };
}

export function buildCommissionMonthlySeries(
  installments: CommissionInstallmentEntry[],
  {
    monthsBack,
    monthsForward,
    labelMode = "numeric",
    referenceDate = new Date(),
  }: MonthlySeriesOptions
): CommissionMonthlyPoint[] {
  const today = startOfDay(referenceDate);
  const series: CommissionMonthlyPoint[] = [];

  for (let offset = -monthsBack; offset <= monthsForward; offset++) {
    const monthStart = startOfMonth(addMonths(today, offset));
    series.push(createSeriesPoint(monthStart, labelMode));
  }

  const pointsByMonth = new Map(series.map((point) => [point.key, point]));

  for (const installment of installments) {
    const value = Number(installment.value);
    if (!Number.isFinite(value)) continue;

    if (installment.status === "recebido" && installment.paid_date) {
      const paidDate = parseDateOnly(installment.paid_date);
      const target = pointsByMonth.get(format(startOfMonth(paidDate), "yyyy-MM"));
      if (!target) continue;
      target.recebido += value;
      target.total += value;
      continue;
    }

    const dueDate = parseDateOnly(installment.due_date);
    const target = pointsByMonth.get(format(startOfMonth(dueDate), "yyyy-MM"));
    if (!target) continue;

    if (isBefore(dueDate, today)) {
      target.atrasado += value;
    } else {
      target.previsto += value;
    }
    target.total += value;
  }

  return series;
}

export function isDateWithinMonth(date: Date, monthStart: Date): boolean {
  const monthEnd = endOfMonth(monthStart);
  return date >= monthStart && date <= monthEnd;
}
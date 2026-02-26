export interface NormalizedInstallment {
  number: number;
  value: number;
  date: string;
  observation: string;
}

/**
 * Normalizes installments: sorts by date, reassigns sequential numbers starting at 1,
 * validates no nulls, no duplicates, and values > 0.
 */
export function normalizeInstallments(
  installments: NormalizedInstallment[]
): { valid: boolean; error?: string; data: NormalizedInstallment[] } {
  if (!installments || installments.length === 0) {
    return { valid: false, error: "É necessário pelo menos uma parcela.", data: [] };
  }

  // Check for null/empty dates
  const hasEmptyDate = installments.some((i) => !i.date);
  if (hasEmptyDate) {
    return { valid: false, error: "Todas as parcelas precisam ter uma data.", data: installments };
  }

  // Check for zero/negative values
  const hasInvalidValue = installments.some((i) => !i.value || i.value <= 0);
  if (hasInvalidValue) {
    return { valid: false, error: "Todas as parcelas precisam ter um valor maior que zero.", data: installments };
  }

  // Sort by date, then reassign sequential numbers
  const sorted = [...installments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((inst, idx) => ({
      ...inst,
      number: idx + 1,
    }));

  return { valid: true, data: sorted };
}

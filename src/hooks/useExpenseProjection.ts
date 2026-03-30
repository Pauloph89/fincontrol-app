import { useMemo } from "react";
import { addMonths, startOfMonth, endOfMonth, setDate, isAfter, isBefore, startOfDay } from "date-fns";
import { useExpenseRules, ExpenseRule } from "./useExpenseRules";

export interface ProjectedExpense {
  id: string; // virtual id: rule_id + date
  rule_id: string;
  name: string;
  category: string;
  value: number;
  account: string;
  due_date: string;
  recurrence_type: string;
  type: string;
  is_virtual: true;
}

/**
 * Generates virtual (non-persisted) expense projections from active rules.
 * Used by Dashboard, Cash Flow, and Projections pages.
 * Does NOT save to the database.
 */
export function useExpenseProjection(monthsAhead: number = 12) {
  const { rulesQuery } = useExpenseRules();
  const rules = rulesQuery.data || [];

  const projections = useMemo(() => {
    const today = startOfDay(new Date());
    const endLimit = endOfMonth(addMonths(today, monthsAhead));
    const result: ProjectedExpense[] = [];

    rules.forEach((rule) => {
      if (!rule.active) return;
      const ruleStart = startOfDay(new Date(rule.start_date));
      const ruleEnd = rule.end_date ? startOfDay(new Date(rule.end_date)) : endLimit;
      const effectiveEnd = isBefore(ruleEnd, endLimit) ? ruleEnd : endLimit;
      const days: number[] = Array.isArray(rule.recurrence_days) ? rule.recurrence_days : [1];

      // Iterate month by month
      let current = startOfMonth(today);
      while (!isAfter(current, effectiveEnd)) {
        const shouldGenerate = shouldGenerateForMonth(rule.recurrence_type, ruleStart, current);
        
        if (shouldGenerate) {
          days.forEach((day) => {
            const year = current.getFullYear();
            const month = current.getMonth();
            const maxDay = new Date(year, month + 1, 0).getDate();
            const actualDay = Math.min(day, maxDay);
            const dueDate = new Date(year, month, actualDay);
            
            if (isBefore(dueDate, ruleStart)) return;
            if (isAfter(dueDate, effectiveEnd)) return;

            result.push({
              id: `${rule.id}_${dueDate.toISOString().split("T")[0]}`,
              rule_id: rule.id,
              name: rule.name,
              category: rule.category,
              value: Number(rule.value),
              account: rule.account,
              due_date: dueDate.toISOString().split("T")[0],
              recurrence_type: rule.recurrence_type,
              type: rule.type || "fixa",
              is_virtual: true,
            });
          });
        }

        current = addMonths(current, 1);
      }
    });

    return result.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [rules, monthsAhead]);

  return { projections, rulesQuery };
}

function shouldGenerateForMonth(type: string, start: Date, current: Date): boolean {
  const monthsDiff = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
  if (monthsDiff < 0) return false;
  
  switch (type) {
    case "mensal":
    case "quinzenal":
    case "semanal":
    case "personalizado":
      return true;
    case "trimestral":
      return monthsDiff % 3 === 0;
    case "anual":
      return monthsDiff % 12 === 0;
    default:
      return true;
  }
}

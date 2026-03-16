import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useSalesGoal(year: number, month: number) {
  const { user, companyId } = useAuth();
  const queryClient = useQueryClient();

  const goalQuery = useQuery({
    queryKey: ["sales_goal", companyId, year, month],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_goals")
        .select("*")
        .eq("company_id", companyId)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; goal_value: number } | null;
    },
    enabled: !!user && !!companyId,
  });

  const upsertGoal = useMutation({
    mutationFn: async (goalValue: number) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const existing = goalQuery.data;
      if (existing) {
        const { error } = await supabase
          .from("sales_goals" as any)
          .update({ goal_value: goalValue, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sales_goals" as any)
          .insert({
            company_id: companyId,
            user_id: user.id,
            year,
            month,
            goal_value: goalValue,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_goal", companyId, year, month] });
    },
  });

  return { goal: goalQuery.data, goalQuery, upsertGoal };
}

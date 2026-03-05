import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCompany() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile-company", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const companyId = (profileQuery.data as any)?.company_id as string | null;

  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!companyId,
  });

  return {
    companyId,
    company: companyQuery.data,
    companyQuery,
    profileQuery,
    isLoading: profileQuery.isLoading,
    hasCompany: !!companyId,
  };
}

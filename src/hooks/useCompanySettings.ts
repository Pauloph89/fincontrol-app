import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CompanySettings {
  id: string;
  name: string;
  cnpj: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface ProfileSettings {
  financial_day_start: number;
  default_account: string;
  alert_days: number;
  currency: string;
}

export function useCompanySettings() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ["company_settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies" as any)
        .select("*")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      const company = data as any as CompanySettings;
      // Generate signed URL for logo if stored as a storage path
      if (company.logo_url && !company.logo_url.startsWith("http")) {
        const { data: signedData } = await supabase.storage
          .from("company-assets")
          .createSignedUrl(company.logo_url, 3600);
        if (signedData?.signedUrl) {
          company.logo_url = signedData.signedUrl;
        }
      }
      return company;
    },
    enabled: !!user && !!companyId,
  });

  const profileQuery = useQuery({
    queryKey: ["profile_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("financial_day_start, default_account, alert_days, currency")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as unknown as ProfileSettings;
    },
    enabled: !!user,
  });

  const updateCompany = useMutation({
    mutationFn: async (updates: Partial<CompanySettings>) => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase
        .from("companies" as any)
        .update(updates as any)
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast({ title: "Dados da empresa salvos!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<ProfileSettings>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile_settings"] });
      toast({ title: "Configurações salvas!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !companyId) throw new Error("Not authenticated");
      const filePath = `${companyId}/logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      // Store the storage path, generate signed URL for display
      const logoPath = filePath;
      await supabase
        .from("companies" as any)
        .update({ logo_url: logoPath } as any)
        .eq("id", companyId);
      return logoPath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast({ title: "Logo atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    },
  });

  // Combined settings for backward compat
  const settingsQuery = {
    isLoading: companyQuery.isLoading || profileQuery.isLoading,
    data: companyQuery.data && profileQuery.data ? {
      ...companyQuery.data,
      company_name: companyQuery.data.name,
      company_logo_url: companyQuery.data.logo_url,
      ...profileQuery.data,
    } : undefined,
  };

  // Legacy updateSettings that routes to correct table
  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const companyFields: any = {};
      const profileFields: any = {};

      if (updates.company_name !== undefined) companyFields.name = updates.company_name;
      if (updates.cnpj !== undefined) companyFields.cnpj = updates.cnpj;
      if (updates.email !== undefined) companyFields.email = updates.email;
      if (updates.phone !== undefined) companyFields.phone = updates.phone;
      if (updates.primary_color !== undefined) companyFields.primary_color = updates.primary_color;
      if (updates.secondary_color !== undefined) companyFields.secondary_color = updates.secondary_color;

      if (updates.financial_day_start !== undefined) profileFields.financial_day_start = updates.financial_day_start;
      if (updates.default_account !== undefined) profileFields.default_account = updates.default_account;
      if (updates.alert_days !== undefined) profileFields.alert_days = updates.alert_days;
      if (updates.currency !== undefined) profileFields.currency = updates.currency;

      if (Object.keys(companyFields).length > 0) {
        await updateCompany.mutateAsync(companyFields);
      }
      if (Object.keys(profileFields).length > 0) {
        await updateProfile.mutateAsync(profileFields);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      queryClient.invalidateQueries({ queryKey: ["profile_settings"] });
    },
  });

  return { settingsQuery, updateSettings, uploadLogo, updateCompany, updateProfile, companyQuery, profileQuery };
}

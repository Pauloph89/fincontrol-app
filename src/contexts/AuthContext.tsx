import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  companyId: string | null;
  companyLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  companyId: null,
  companyLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load company_id when user changes
  useEffect(() => {
    if (!session?.user) {
      setCompanyId(null);
      setCompanyLoading(false);
      return;
    }

    setCompanyLoading(true);
    supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setCompanyId((data as any)?.company_id ?? null);
        setCompanyLoading(false);
      });
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, companyId, companyLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

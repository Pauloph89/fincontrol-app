import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Commissions from "./pages/Commissions";
import Expenses from "./pages/Expenses";
import CashFlow from "./pages/CashFlow";
import Reconciliation from "./pages/Reconciliation";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Projections from "./pages/Projections";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";
import { Building2 } from "lucide-react";

const queryClient = new QueryClient();

function NoCompanyGuard() {
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-md space-y-4">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Usuário não vinculado a nenhuma empresa</h2>
        <p className="text-muted-foreground text-sm">
          Entre em contato com o administrador da sua empresa para receber acesso ao sistema.
        </p>
        <button onClick={signOut} className="text-sm text-primary hover:underline">
          Sair
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading, companyId, companyLoading } = useAuth();

  if (loading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!session) return <Auth />;

  if (!companyId) return <NoCompanyGuard />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/comissoes" element={<Commissions />} />
        <Route path="/despesas" element={<Expenses />} />
        <Route path="/conciliacao" element={<Reconciliation />} />
        <Route path="/fluxo-caixa" element={<CashFlow />} />
        <Route path="/projecoes" element={<Projections />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Receipt, Wallet, ArrowLeftRight, TrendingUp,
  BarChart3, FileBarChart, Settings, LogOut, Building2, ShoppingCart,
  Users, Factory, Upload,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useUserRole } from "@/hooks/useUserRole";

const allMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "CRM / Clientes", url: "/clientes", icon: Users, module: "clientes" },
  { title: "Fábricas", url: "/fabricas", icon: Factory, module: "fabricas" },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart, module: "pedidos" },
  { title: "Comissões", url: "/comissoes", icon: Receipt, module: "comissoes" },
  { title: "Importação", url: "/importacao", icon: Upload, module: "importacao" },
  { title: "Despesas", url: "/despesas", icon: Wallet, module: "despesas" },
  { title: "Conciliação", url: "/conciliacao", icon: ArrowLeftRight, module: "conciliacao" },
  { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: TrendingUp, module: "fluxo-caixa" },
  { title: "Projeções", url: "/projecoes", icon: BarChart3, module: "projecoes" },
  { title: "Relatórios", url: "/relatorios", icon: FileBarChart, module: "relatorios" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, module: "configuracoes" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { settingsQuery } = useCompanySettings();
  const { hasAccess } = useUserRole();
  const settings = settingsQuery.data;

  const menuItems = allMenuItems.filter((item) => hasAccess(item.module));

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-3">
          {settings?.company_logo_url ? (
            <img src={settings.company_logo_url} alt="Logo" className="h-9 w-9 rounded-lg object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-sidebar-foreground tracking-tight truncate">
              {settings?.company_name || "FinControl"}
            </h2>
            <p className="text-xs text-sidebar-foreground/60">Sistema Financeiro</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

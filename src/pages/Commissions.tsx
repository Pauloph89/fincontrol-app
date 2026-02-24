import { CommissionForm } from "@/components/commissions/CommissionForm";
import { CommissionsList } from "@/components/commissions/CommissionsList";

export default function Commissions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas comissões e parcelas de recebimento</p>
        </div>
        <CommissionForm />
      </div>
      <CommissionsList />
    </div>
  );
}

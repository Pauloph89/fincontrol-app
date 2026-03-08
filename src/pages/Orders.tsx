import { OrderForm } from "@/components/orders/OrderForm";
import { OrdersList } from "@/components/orders/OrdersList";
import { PdfImportDialog } from "@/components/orders/PdfImportDialog";

export default function Orders() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus pedidos, parcelas e comissões</p>
        </div>
        <div className="flex gap-2">
          <PdfImportDialog />
          <OrderForm />
        </div>
      </div>
      <OrdersList />
    </div>
  );
}

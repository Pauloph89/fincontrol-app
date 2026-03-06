import { OrderForm } from "@/components/orders/OrderForm";
import { OrdersList } from "@/components/orders/OrdersList";

export default function Orders() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus pedidos, parcelas e comissões</p>
        </div>
        <OrderForm />
      </div>
      <OrdersList />
    </div>
  );
}

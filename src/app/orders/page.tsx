export const dynamic = 'force-dynamic'

import AdminShell from '@/components/AdminShell'
import OrdersPage from '@/components/OrdersPage'
import { getOrders } from './actions'

export const metadata = {
  title: '全部运单 - 订单中心',
}

export default async function OrderListPage() {
  const initialData = await getOrders()
  
  return (
    <AdminShell>
      <OrdersPage initialItems={initialData.items} initialTotal={initialData.total} />
    </AdminShell>
  )
}

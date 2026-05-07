'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { getOrders, type OrderFilters } from '@/app/orders/actions'
import type { Order } from '@/generated/prisma/client'

export default function OrdersPage({ initialItems, initialTotal }: { initialItems: Order[], initialTotal: number }) {
  const [orders, setOrders] = useState(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 10))
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState<OrderFilters>({})

  const refreshOrders = useCallback(async (f?: OrderFilters, p = page, ps = pageSize) => {
    const res = await getOrders(f ?? filters, p, ps)
    setOrders(res.items)
    setTotal(res.total)
    setTotalPages(res.totalPages)
    setPage(res.page)
  }, [filters, page, pageSize])

  const set = (key: keyof OrderFilters, val: string) => {
    const newFilters = { ...filters, [key]: val || undefined }
    setFilters(newFilters)
    startTransition(() => refreshOrders(newFilters, 1))
  }

  return (
    <div className="pt-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>已导入运单</h1>
        <Link href="/orders/import" className="btn btn-primary">
          万能导入下单
        </Link>
      </div>

      <div className="pt-filter-bar">
        <div className="pt-filter-item">
          <label className="pt-filter-label">外部编码</label>
          <input className="pt-filter-input" placeholder="输入外部编码" 
            value={filters.externalCode || ''} onChange={e => set('externalCode', e.target.value)} />
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">收件人</label>
          <input className="pt-filter-input" placeholder="输入收件人姓名" 
            value={filters.receiverName || ''} onChange={e => set('receiverName', e.target.value)} />
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">提交时间</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="date" className="pt-filter-input" value={filters.startTime || ''} onChange={e => set('startTime', e.target.value)} />
            <span style={{ color: '#aaa', alignSelf: 'center' }}>-</span>
            <input type="date" className="pt-filter-input" value={filters.endTime || ''} onChange={e => set('endTime', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="pt-table-wrapper" style={{ opacity: isPending ? 0.6 : 1 }}>
        <table className="pt-table">
          <thead>
            <tr>
              <th>外部编码</th>
              <th>发件人</th>
              <th>收件人</th>
              <th>重量(kg)</th>
              <th>件数</th>
              <th>温层</th>
              <th>导入时间</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>暂无运单记录</td></tr>
            ) : (
              orders.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 500, color: 'var(--primary)' }}>{order.externalCode || '-'}</td>
                  <td>
                    {order.senderName}<br/>
                    <span style={{ fontSize: '11px', color: '#888' }}>{order.senderPhone}</span>
                  </td>
                  <td>
                    {order.receiverName}<br/>
                    <span style={{ fontSize: '11px', color: '#888' }}>{order.receiverPhone}</span>
                  </td>
                  <td>{order.weight}</td>
                  <td>{order.quantity}</td>
                  <td>{order.temperatureZone}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div className="pt-pagination">
            <span>共 {total} 条记录</span>
            <div className="pt-page-controls">
              <button disabled={page === 1} onClick={() => startTransition(() => refreshOrders(filters, page - 1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => startTransition(() => refreshOrders(filters, page + 1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

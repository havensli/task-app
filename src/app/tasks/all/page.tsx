export const dynamic = 'force-dynamic'

import AdminShell from '@/components/AdminShell'
import AllTasksPage from '@/components/AllTasksPage'
import { getAllPersonalTasks, getPersonalTaskStats } from '@/app/tasks/my/actions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '全部任务 - 任务管理系统',
  description: '查看所有任务的统计概览与列表',
}

export default async function AllTasksRoute() {
  const [{ items, total }, stats] = await Promise.all([
    getAllPersonalTasks({}, 1, 10),
    getPersonalTaskStats(),
  ])

  return (
    <AdminShell>
      <AllTasksPage initialItems={items} initialTotal={total} stats={stats} />
    </AdminShell>
  )
}

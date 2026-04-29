export const dynamic = 'force-dynamic'

import AdminShell from '@/components/AdminShell'
import PersonalTaskPage from '@/components/PersonalTaskPage'
import { getPersonalTasks } from '@/app/tasks/my/actions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '个人任务 - 任务管理系统',
  description: '个人任务管理，支持增删改查、状态追踪和通知配置',
}

export default async function MyTasksPage() {
  const { items, total } = await getPersonalTasks({}, 1, 10)

  return (
    <AdminShell>
      <PersonalTaskPage initialItems={items} initialTotal={total} />
    </AdminShell>
  )
}

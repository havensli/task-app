export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import AdminShell from '@/components/AdminShell'
import HomeDashboard from '@/components/HomeDashboard'

export default async function Home() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const total = tasks.length
  const completed = tasks.filter((t: { completed: boolean }) => t.completed).length
  const pending = total - completed
  const overdueBefore = new Date()
  overdueBefore.setDate(overdueBefore.getDate() - 7)
  const overdue = tasks.filter((t: { completed: boolean; createdAt: Date }) => {
    if (t.completed) return false
    return new Date(t.createdAt) < overdueBefore
  }).length

  return (
    <AdminShell>
      <HomeDashboard
        tasks={tasks}
        stats={{ total, completed, pending, overdue }}
      />
    </AdminShell>
  )
}

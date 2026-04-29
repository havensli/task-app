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
  const overdue = tasks.filter((t: { completed: boolean; createdAt: Date }) => {
    if (t.completed) return false
    const daysDiff = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff > 7
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

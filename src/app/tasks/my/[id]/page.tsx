export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import AdminShell from '@/components/AdminShell'
import TaskDetailPage from '@/components/TaskDetailPage'
import { getPersonalTaskById } from '@/app/tasks/my/actions'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const task = await getPersonalTaskById(Number(id))
  return {
    title: task ? `${task.name} - 任务详情` : '任务详情',
    description: task?.description ?? '任务详情页面',
  }
}

export default async function TaskDetailRoute({ params }: Props) {
  const { id } = await params
  const task = await getPersonalTaskById(Number(id))
  if (!task) notFound()

  return (
    <AdminShell>
      <TaskDetailPage task={task} />
    </AdminShell>
  )
}

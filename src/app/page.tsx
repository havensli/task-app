import { prisma } from '@/lib/prisma'
import TaskForm from '@/components/TaskForm'
import TaskList from '@/components/TaskList'

export default async function Home() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const total = tasks.length
  const completed = tasks.filter((t: { completed: boolean }) => t.completed).length

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Manager</h1>
        <p className="text-gray-500 mb-8">
          {completed}/{total} tasks completed
        </p>

        <TaskForm />
        <TaskList tasks={tasks} />
      </div>
    </main>
  )
}

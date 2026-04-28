'use client'

import { useTransition } from 'react'
import { toggleTask, deleteTask } from '@/app/actions'

type Task = {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: Date
}

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const [isPending, startTransition] = useTransition()

  if (tasks.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">
        No tasks yet. Add one above!
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <button
            onClick={() =>
              startTransition(() => toggleTask(task.id, task.completed))
            }
            disabled={isPending}
            className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
              task.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-blue-400'
            }`}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.completed && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={`font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
            )}
          </div>

          <button
            onClick={() =>
              startTransition(() => deleteTask(task.id))
            }
            disabled={isPending}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            aria-label="Delete task"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}

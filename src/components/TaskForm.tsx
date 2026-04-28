'use client'

import { useRef, useTransition } from 'react'
import { createTask } from '@/app/actions'

export default function TaskForm() {
  const ref = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTask(formData)
      ref.current?.reset()
    })
  }

  return (
    <form ref={ref} action={handleSubmit} className="space-y-3 mb-8">
      <input
        name="title"
        placeholder="Task title"
        required
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        name="description"
        placeholder="Description (optional)"
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Adding…' : 'Add Task'}
      </button>
    </form>
  )
}

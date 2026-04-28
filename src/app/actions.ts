'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!title?.trim()) return

  await prisma.task.create({
    data: { title: title.trim(), description: description?.trim() || null },
  })

  revalidatePath('/')
}

export async function toggleTask(id: number, completed: boolean) {
  await prisma.task.update({
    where: { id },
    data: { completed: !completed },
  })
  revalidatePath('/')
}

export async function deleteTask(id: number) {
  await prisma.task.delete({ where: { id } })
  revalidatePath('/')
}

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export type PersonalTaskFormData = {
  name: string
  description?: string
  startTime?: string
  endTime?: string
  source?: string
  urgency: string
  assignee?: string
  collaborator?: string
  status: string
  notifyContent?: string
  sendNotify: boolean
  extFields?: string
  createdBy?: string
  updatedBy?: string
}

export type TaskFilters = {
  name?: string
  status?: string
  source?: string
  assignee?: string
  collaborator?: string
  startTime?: string
  endTime?: string
}

function buildWhere(filters?: TaskFilters) {
  const where: Record<string, unknown> = {}
  if (filters?.name)         where.name         = { contains: filters.name,         mode: 'insensitive' }
  if (filters?.status)       where.status       = filters.status
  if (filters?.source)       where.source       = { contains: filters.source,       mode: 'insensitive' }
  if (filters?.assignee)     where.assignee     = { contains: filters.assignee,     mode: 'insensitive' }
  if (filters?.collaborator) where.collaborator = { contains: filters.collaborator, mode: 'insensitive' }
  if (filters?.startTime)    where.startTime    = { gte: new Date(filters.startTime) }
  if (filters?.endTime)      where.endTime      = { lte: new Date(filters.endTime) }
  return where
}

// Paginated list
export async function getPersonalTasks(filters?: TaskFilters, page = 1, pageSize = 10) {
  const where = buildWhere(filters)
  const [items, total] = await Promise.all([
    prisma.personalTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.personalTask.count({ where }),
  ])
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

// Single record
export async function getPersonalTaskById(id: number) {
  return prisma.personalTask.findUnique({ where: { id } })
}

// All tasks (no pagination, for "全部任务" stats)
export async function getAllPersonalTasks(filters?: TaskFilters, page = 1, pageSize = 10) {
  return getPersonalTasks(filters, page, pageSize)
}

// Stats for dashboard
export async function getPersonalTaskStats() {
  const [total, pending, processing, done, cancelled] = await Promise.all([
    prisma.personalTask.count(),
    prisma.personalTask.count({ where: { status: '待处理' } }),
    prisma.personalTask.count({ where: { status: '处理中' } }),
    prisma.personalTask.count({ where: { status: '已完成' } }),
    prisma.personalTask.count({ where: { status: '已取消' } }),
  ])
  return { total, pending, processing, done, cancelled }
}

export async function createPersonalTask(data: PersonalTaskFormData) {
  await prisma.personalTask.create({
    data: {
      name:          data.name,
      description:   data.description   || null,
      startTime:     data.startTime     ? new Date(data.startTime)  : null,
      endTime:       data.endTime       ? new Date(data.endTime)    : null,
      source:        data.source        || null,
      urgency:       data.urgency,
      assignee:      data.assignee      || null,
      collaborator:  data.collaborator  || null,
      status:        data.status,
      notifyContent: data.notifyContent || null,
      sendNotify:    data.sendNotify,
      extFields:     data.extFields     || null,
      createdBy:     data.createdBy     || '管理员',
      updatedBy:     data.updatedBy     || '管理员',
    },
  })
  revalidatePath('/tasks/my')
  revalidatePath('/tasks/all')
}

export async function updatePersonalTask(id: number, data: PersonalTaskFormData) {
  await prisma.personalTask.update({
    where: { id },
    data: {
      name:          data.name,
      description:   data.description   || null,
      startTime:     data.startTime     ? new Date(data.startTime)  : null,
      endTime:       data.endTime       ? new Date(data.endTime)    : null,
      source:        data.source        || null,
      urgency:       data.urgency,
      assignee:      data.assignee      || null,
      collaborator:  data.collaborator  || null,
      status:        data.status,
      notifyContent: data.notifyContent || null,
      sendNotify:    data.sendNotify,
      extFields:     data.extFields     || null,
      updatedBy:     data.updatedBy     || '管理员',
    },
  })
  revalidatePath('/tasks/my')
  revalidatePath('/tasks/all')
  revalidatePath(`/tasks/my/${id}`)
}

export async function deletePersonalTask(id: number) {
  await prisma.personalTask.delete({ where: { id } })
  revalidatePath('/tasks/my')
  revalidatePath('/tasks/all')
}

export async function deletePersonalTasks(ids: number[]) {
  await prisma.personalTask.deleteMany({ where: { id: { in: ids } } })
  revalidatePath('/tasks/my')
  revalidatePath('/tasks/all')
}

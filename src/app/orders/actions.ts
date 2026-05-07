'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { DateTimeFilter, OrderWhereInput } from '@/generated/prisma/models'

export type OrderFormData = {
  id?: number
  externalCode?: string
  senderName: string
  senderPhone: string
  senderAddress: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  weight: number
  quantity: number
  temperatureZone: string
  remark?: string
}

export type OrderFilters = {
  externalCode?: string
  receiverName?: string
  startTime?: string
  endTime?: string
}

function normalizeExternalCode(code: string | null | undefined) {
  return code?.trim() || null
}

// Check existing external codes in the DB to avoid duplicates
export async function checkExternalCodes(codes: string[]) {
  const normalizedCodes = Array.from(
    new Set(codes.map(code => normalizeExternalCode(code)).filter((code): code is string => Boolean(code))),
  )
  if (normalizedCodes.length === 0) return []

  const existing = await prisma.order.findMany({
    where: { externalCode: { in: normalizedCodes } },
    select: { externalCode: true },
  })
  return existing.map(order => order.externalCode).filter((code): code is string => Boolean(code))
}

// Fetch saved mapping by hash
export async function getTemplateMapping(hash: string) {
  const mapping = await prisma.templateMapping.findUnique({
    where: { hash },
  })
  if (mapping) {
    return JSON.parse(mapping.mapping)
  }
  return null
}

export async function getAllTemplateMappings() {
  const mappings = await prisma.templateMapping.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { hash: true, mapping: true },
  })

  return mappings.map(item => ({
    hash: item.hash,
    mapping: JSON.parse(item.mapping) as Record<string, string>,
  }))
}

// Save or update mapping
export async function saveTemplateMapping(hash: string, mappingRules: Record<string, string>) {
  await prisma.templateMapping.upsert({
    where: { hash },
    update: { mapping: JSON.stringify(mappingRules) },
    create: { hash, mapping: JSON.stringify(mappingRules) },
  })
}

// Bulk create orders in chunks
export async function bulkCreateOrders(orders: OrderFormData[]) {
  const codes = orders.map(order => normalizeExternalCode(order.externalCode)).filter((code): code is string => Boolean(code))
  const codeCounts = new Map<string, number>()
  codes.forEach(code => {
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1)
  })

  const duplicateCodes = Array.from(codeCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([code]) => code)

  const existingCodes = await checkExternalCodes(codes)
  const errors = [
    ...duplicateCodes.map(code => `外部编码 ${code} 在本次提交中重复`),
    ...existingCodes.map(code => `外部编码 ${code} 已存在`),
  ]

  if (errors.length > 0) {
    return { successCount: 0, failCount: orders.length, errors }
  }

  // Prisma createMany has a limit, typically chunking is better. But createMany can handle thousands.
  // We'll trust createMany up to 5000, but let's chunk it by 500 just in case.
  const CHUNK_SIZE = 500
  let successCount = 0
  let failCount = 0
  const errorsDuringCreate: string[] = []
  
  for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
    const chunk = orders.slice(i, i + CHUNK_SIZE)
    try {
      const result = await prisma.order.createMany({
        data: chunk.map((o) => ({
          externalCode: normalizeExternalCode(o.externalCode),
          senderName: o.senderName,
          senderPhone: o.senderPhone,
          senderAddress: o.senderAddress,
          receiverName: o.receiverName,
          receiverPhone: o.receiverPhone,
          receiverAddress: o.receiverAddress,
          weight: o.weight,
          quantity: o.quantity,
          temperatureZone: o.temperatureZone || '常温',
          remark: o.remark || null,
        })),
      })
      successCount += result.count
      failCount += (chunk.length - result.count)
    } catch (error) {
      failCount += chunk.length
      errorsDuringCreate.push('外部编码唯一校验未通过或数据库写入失败，请刷新后复查重复编码')
      console.error('Batch insert error', error)
    }
  }

  revalidatePath('/orders')
  return { successCount, failCount, errors: errorsDuringCreate }
}

// Get paginated orders list
export async function getOrders(filters?: OrderFilters, page = 1, pageSize = 10) {
  const where: OrderWhereInput = {}
  const createdAt: DateTimeFilter<'Order'> = {}
  
  if (filters?.externalCode) {
    where.externalCode = { contains: filters.externalCode, mode: 'insensitive' }
  }
  if (filters?.receiverName) {
    where.receiverName = { contains: filters.receiverName, mode: 'insensitive' }
  }
  if (filters?.startTime) {
    createdAt.gte = new Date(filters.startTime)
  }
  if (filters?.endTime) {
    const end = new Date(filters.endTime)
    end.setHours(23, 59, 59, 999)
    createdAt.lte = end
  }
  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ])
  
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

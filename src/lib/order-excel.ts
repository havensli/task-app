import * as XLSX from 'xlsx'
import type { OrderFormData } from '@/app/orders/actions'

export type OrderFieldKey = Exclude<keyof OrderFormData, 'id'>

export type SystemField = {
  key: OrderFieldKey
  label: string
  required: boolean
  options?: string[]
  width: number
}

export type ParseProgress = {
  percent: number
  current: number
  total: number
  message: string
}

export type ParsedExcelData = {
  headers: string[]
  rawData: Record<string, unknown>[]
  sheetName: string
  headerRowNumber: number
}

export type ImportedOrderRow = Partial<OrderFormData> & {
  _rowId: string
  _rowNum: number
}

export type FieldError = {
  field: OrderFieldKey
  fieldLabel: string
  message: string
}

export type ValidationErrors = Record<number, Partial<Record<OrderFieldKey, string>>>

export const SYSTEM_FIELDS: SystemField[] = [
  { key: 'externalCode', label: '外部编码', required: false, width: 160 },
  { key: 'senderName', label: '发件人姓名', required: true, width: 140 },
  { key: 'senderPhone', label: '发件人电话', required: true, width: 150 },
  { key: 'senderAddress', label: '发件人地址', required: true, width: 260 },
  { key: 'receiverName', label: '收件人姓名', required: true, width: 140 },
  { key: 'receiverPhone', label: '收件人电话', required: true, width: 150 },
  { key: 'receiverAddress', label: '收件人地址', required: true, width: 260 },
  { key: 'weight', label: '重量 (kg)', required: true, width: 110 },
  { key: 'quantity', label: '件数', required: true, width: 90 },
  { key: 'temperatureZone', label: '温层', required: true, options: ['常温', '冷藏', '冷冻'], width: 110 },
  { key: 'remark', label: '备注', required: false, width: 220 },
]

const fieldByKey = new Map(SYSTEM_FIELDS.map(field => [field.key, field]))

const FIELD_ALIASES: Record<OrderFieldKey, string[]> = {
  externalCode: [
    '外部编码',
    '外部系统订单号',
    '外部系统订单唯一编号',
    '客户订单号',
    '客户单号',
    '订单编号',
    '订单号',
    '订单编码',
    '客户编码',
    '商家订单号',
    '原始单号',
    '引用编码',
    '参考编码',
    'ref',
    'refcode',
    'referencecode',
    'sourceorder',
    'externalcode',
    'externalordercode',
    'ordercode',
    'orderno',
  ],
  senderName: ['发件人姓名', '发件人', '寄件人姓名', '寄件人', '寄方姓名', '寄方', '发货人', 'sender', 'sendername', 'shipper', 'shippername'],
  senderPhone: ['发件人电话', '发件人手机', '寄件人电话', '寄件人手机', '寄方电话', '寄方手机', '发货人电话', 'senderphone', 'sendermobile', 'shipperphone'],
  senderAddress: ['发件人地址', '寄件人地址', '寄方地址', '发货地址', '发货人地址', 'senderaddress', 'shipperaddress'],
  receiverName: ['收件人姓名', '收件人', '收货人姓名', '收货人', '收方姓名', '收方', '客户姓名', 'receiver', 'receivername', 'consignee', 'consigneename'],
  receiverPhone: ['收件人电话', '收件人手机', '收货人电话', '收货人手机', '收方电话', '收方手机', '客户电话', 'receiverphone', 'receivermobile', 'consigneephone'],
  receiverAddress: ['收件人地址', '收货人地址', '收方地址', '客户地址', '到货地址', 'receiveraddress', 'consigneeaddress'],
  weight: ['重量 (kg)', '重量(kg)', '重量', '货物重量', '计费重量', '包裹重量', 'kg', 'weight', 'weightkg'],
  quantity: ['件数', '包裹数量', '数量', '箱数', '件量', '包数', 'qty', 'quantity', 'packages', 'packagecount'],
  temperatureZone: ['温层', '运输温层', '货物温层', '温控类型', '温度类型', '温区', 'temperature', 'temperaturezone', 'tempzone'],
  remark: ['备注', '附加说明', '附言', '说明', '客户备注', '订单备注', 'remark', 'memo', 'note', 'comments'],
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）_\-:：/\\.,，。]/g, '')
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || normalizeText(value) === ''
}

function makeUniqueHeaders(rawHeaders: unknown[]) {
  const seen = new Map<string, number>()
  return rawHeaders.map((raw, index) => {
    const base = normalizeText(raw) || `未命名列${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}_${count + 1}`
  })
}

function compactHeaders(headers: string[]) {
  return headers.map(normalizeHeader).filter(Boolean)
}

function headerSimilarity(a: string[], b: string[]) {
  const left = new Set(compactHeaders(a))
  const right = new Set(compactHeaders(b))
  if (left.size === 0 || right.size === 0) return 0
  let hit = 0
  left.forEach(header => {
    if (right.has(header)) hit += 1
  })
  return hit / Math.max(left.size, right.size)
}

export function getHeadersHash(headers: string[]) {
  return compactHeaders(headers).join('|')
}

export function parseStoredHeaders(hash: string) {
  return hash.split('|').map(part => part.trim()).filter(Boolean)
}

export function findSimilarMapping(
  headers: string[],
  storedMappings: { hash: string; mapping: Record<string, string> }[],
) {
  let bestMapping: Record<string, string> | null = null
  let bestScore = 0

  storedMappings.forEach(item => {
    const score = headerSimilarity(headers, parseStoredHeaders(item.hash))
    if (score > bestScore) {
      bestMapping = item.mapping
      bestScore = score
    }
  })

  if (!bestMapping || bestScore < 0.72) return null

  const remapped: Record<string, string> = {}
  const oldEntries = Object.entries(bestMapping) as [string, string][]
  headers.forEach(header => {
    const normalized = normalizeHeader(header)
    const exact = oldEntries.find(([oldHeader]) => normalizeHeader(oldHeader) === normalized)
    remapped[header] = exact ? exact[1] : 'IGNORE'
  })

  return { mapping: remapped, score: bestScore }
}

function scoreHeaderForField(header: string, field: SystemField) {
  const normalized = normalizeHeader(header)
  const aliases = FIELD_ALIASES[field.key].map(normalizeHeader)
  if (aliases.includes(normalized)) return 100
  if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) return 82

  if (field.key === 'senderName' && /(寄|发|sender|shipper).*(人|名|name)/i.test(header)) return 76
  if (field.key === 'senderPhone' && /(寄|发|sender|shipper).*(电话|手机|联系|phone|mobile|tel)/i.test(header)) return 76
  if (field.key === 'senderAddress' && /(寄|发|sender|shipper).*(地址|address)/i.test(header)) return 76
  if (field.key === 'receiverName' && /(收|receiver|consignee).*(人|方|名|name)/i.test(header)) return 76
  if (field.key === 'receiverPhone' && /(收|receiver|consignee).*(电话|手机|联系|phone|mobile|tel)/i.test(header)) return 76
  if (field.key === 'receiverAddress' && /(收|receiver|consignee).*(地址|address)/i.test(header)) return 76
  if (field.key === 'temperatureZone' && /(温|冷|temperature|temp)/i.test(header)) return 70

  return 0
}

export function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const usedFields = new Set<string>()

  headers.forEach(header => {
    const candidates = SYSTEM_FIELDS
      .map(field => ({ key: field.key, score: scoreHeaderForField(header, field) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)

    const best = candidates.find(item => !usedFields.has(item.key))
    if (best) {
      mapping[header] = best.key
      usedFields.add(best.key)
    } else {
      mapping[header] = 'IGNORE'
    }
  })

  return mapping
}

export async function parseExcelData(
  file: File,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParsedExcelData> {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    throw new Error('文件格式错误：仅支持 .xlsx / .xls 文件')
  }
  if (file.size === 0) {
    throw new Error('文件为空：请上传包含运单数据的 Excel 文件')
  }

  onProgress?.({ percent: 8, current: 0, total: 0, message: '正在读取文件' })
  const buffer = await file.arrayBuffer()
  onProgress?.({ percent: 22, current: 0, total: 0, message: '正在解析工作簿' })

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false, WTF: false })
  } catch {
    throw new Error('文件编码或内容异常：Excel 解析失败，请另存为 .xlsx 后重试')
  }

  if (!workbook.SheetNames.length) {
    throw new Error('Sheet 不存在：文件中未找到有效工作表')
  }

  type CandidateSheet = {
    sheetName: string
    aoa: unknown[][]
    headerRowIdx: number
    bestScore: number
    dataRows: unknown[][]
  }

  let bestCandidate: CandidateSheet | null = null

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet?.['!ref']) return

    const aoa: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    })

    if (!aoa.length) return

    let headerRowIdx = -1
    let bestScore = 0
    aoa.slice(0, 12).forEach((row, idx) => {
      const cells = row.map(normalizeText).filter(Boolean)
      const aliasScore = cells.reduce((sum, cell) => {
        const max = Math.max(...SYSTEM_FIELDS.map(field => scoreHeaderForField(cell, field)), 0)
        return sum + (max >= 70 ? 2 : max > 0 ? 1 : 0)
      }, 0)
      const score = aliasScore * 10 + cells.length
      if (score > bestScore) {
        bestScore = score
        headerRowIdx = idx
      }
    })

    const dataRows = headerRowIdx >= 0
      ? aoa.slice(headerRowIdx + 1).filter(row => row.some(cell => !isEmpty(cell)))
      : []

    if (!bestCandidate || bestScore > bestCandidate.bestScore) {
      bestCandidate = { sheetName, aoa, headerRowIdx, bestScore, dataRows }
    }
  })

  if (!bestCandidate) {
    throw new Error('Sheet 为空：未找到可导入的数据区域')
  }

  const candidate = bestCandidate as CandidateSheet
  const sheetName = candidate.sheetName
  const aoa = candidate.aoa
  const headerRowIdx = candidate.headerRowIdx
  const bestScore = candidate.bestScore
  const dataRows: unknown[][] = candidate.dataRows
  if (headerRowIdx < 0 || bestScore < 8) {
    throw new Error('无法识别表头：请确认前 12 行内包含姓名、电话、地址、重量、件数、温层等列')
  }

  const headers = makeUniqueHeaders(aoa[headerRowIdx])
  if (!dataRows.length) {
    throw new Error('文件没有有效数据：表头下方未找到可导入行')
  }

  const total = dataRows.length
  const rawData: Record<string, unknown>[] = []
  dataRows.forEach((row, index) => {
    const obj: Record<string, unknown> = {}
    headers.forEach((header, colIdx) => {
      if (header) obj[header] = row[colIdx] ?? ''
    })
    rawData.push(obj)

    if (index % 100 === 0 || index === total - 1) {
      onProgress?.({
        percent: Math.min(96, 25 + Math.round(((index + 1) / total) * 70)),
        current: index + 1,
        total,
        message: '正在读取数据行',
      })
    }
  })

  onProgress?.({ percent: 100, current: total, total, message: '解析完成' })
  return { headers: headers.filter(Boolean), rawData, sheetName, headerRowNumber: headerRowIdx + 1 }
}

export function normalizeOrderRow(row: ImportedOrderRow): ImportedOrderRow {
  const normalized: ImportedOrderRow = { ...row }

  SYSTEM_FIELDS.forEach(field => {
    const value = normalized[field.key]
    if (typeof value === 'string') normalized[field.key] = value.trim() as never

    if (field.key === 'senderPhone' || field.key === 'receiverPhone') {
      const text = normalizeText(normalized[field.key])
      normalized[field.key] = text.replace(/[^\d+]/g, '') as never
    }
    if (field.key === 'weight' && !isEmpty(normalized[field.key])) {
      normalized[field.key] = Number(normalized[field.key]) as never
    }
    if (field.key === 'quantity' && !isEmpty(normalized[field.key])) {
      normalized[field.key] = Number(normalized[field.key]) as never
    }
    if (field.key === 'temperatureZone' && !isEmpty(normalized[field.key])) {
      const valueText = normalizeText(normalized[field.key])
      const aliases: Record<string, string> = {
        normal: '常温',
        ambient: '常温',
        常溫: '常温',
        refrigerated: '冷藏',
        chill: '冷藏',
        chilled: '冷藏',
        frozen: '冷冻',
        freeze: '冷冻',
        冷凍: '冷冻',
      }
      normalized[field.key] = (aliases[valueText.toLowerCase()] ?? valueText) as never
    }
  })

  return normalized
}

export function validateRows(
  rows: ImportedOrderRow[],
  existingExternalCodes: string[] = [],
): { errors: ValidationErrors; flatErrors: string[] } {
  const errors: ValidationErrors = {}
  const flatErrors: string[] = []
  const codeRows = new Map<string, number[]>()
  const existingSet = new Set(existingExternalCodes.map(code => normalizeText(code)).filter(Boolean))

  rows.forEach(row => {
    const code = normalizeText(row.externalCode)
    if (!code) return
    const list = codeRows.get(code) ?? []
    list.push(row._rowNum)
    codeRows.set(code, list)
  })

  rows.forEach(row => {
    const rowErrors: Partial<Record<OrderFieldKey, string>> = {}

    SYSTEM_FIELDS.forEach(field => {
      const value = row[field.key]
      if (field.required && isEmpty(value)) {
        rowErrors[field.key] = '必填项缺失'
        return
      }

      if (isEmpty(value)) return

      if ((field.key === 'senderPhone' || field.key === 'receiverPhone') && !/^\+?\d{7,15}$/.test(normalizeText(value))) {
        rowErrors[field.key] = '电话格式错误'
      }
      if (field.key === 'weight' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
        rowErrors[field.key] = '必须为正数'
      }
      if (field.key === 'quantity' && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
        rowErrors[field.key] = '必须为正整数'
      }
      if (field.key === 'temperatureZone' && field.options && !field.options.includes(normalizeText(value))) {
        rowErrors[field.key] = '只能为常温、冷藏、冷冻'
      }
    })

    const code = normalizeText(row.externalCode)
    if (code) {
      const duplicateRows = codeRows.get(code) ?? []
      if (duplicateRows.length > 1) {
        const others = duplicateRows.filter(rowNum => rowNum !== row._rowNum)
        rowErrors.externalCode = `同批次重复，与第 ${others.join('、')} 行重复`
      } else if (existingSet.has(code)) {
        rowErrors.externalCode = '数据库已存在该编码'
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[row._rowNum] = rowErrors
      Object.entries(rowErrors).forEach(([fieldKey, message]) => {
        const label = fieldByKey.get(fieldKey as OrderFieldKey)?.label ?? fieldKey
        flatErrors.push(`第 ${row._rowNum} 行，${label}：${message}`)
      })
    }
  })

  return { errors, flatErrors }
}

export function transformRows(
  rawData: Record<string, unknown>[],
  mapping: Record<string, string>,
): ImportedOrderRow[] {
  return rawData.map((rawRow, index) => {
    const row: ImportedOrderRow = {
      _rowId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      _rowNum: index + 1,
    }

    Object.entries(rawRow).forEach(([header, value]) => {
      const target = mapping[header] as OrderFieldKey | 'IGNORE' | undefined
      if (target && target !== 'IGNORE') {
        row[target] = value as never
      }
    })

    return normalizeOrderRow(row)
  })
}

export function transformAndValidate(
  rawData: Record<string, unknown>[],
  mapping: Record<string, string>,
  existingExternalCodes: string[],
) {
  const data = transformRows(rawData, mapping)
  const { errors } = validateRows(data, existingExternalCodes)
  return { data, errors }
}

export function resequenceRows(rows: ImportedOrderRow[]) {
  return rows.map((row, index) => ({ ...row, _rowNum: index + 1 }))
}

export function createEmptyRow(nextRowNum: number): ImportedOrderRow {
  return {
    _rowId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    _rowNum: nextRowNum,
    temperatureZone: '常温',
  }
}

export function exportOrdersToExcel(rows: ImportedOrderRow[]) {
  const sheetRows = rows.map(row => {
    const output: Record<string, unknown> = {}
    SYSTEM_FIELDS.forEach(field => {
      output[field.label] = row[field.key] ?? ''
    })
    return output
  })

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
    header: SYSTEM_FIELDS.map(field => field.label),
  })
  worksheet['!cols'] = SYSTEM_FIELDS.map(field => ({ wch: Math.max(10, Math.floor(field.width / 9)) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入预览')
  XLSX.writeFile(workbook, `运单导入预览_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function rowsToOrderFormData(rows: ImportedOrderRow[]): OrderFormData[] {
  return rows.map(row => ({
    externalCode: normalizeText(row.externalCode) || undefined,
    senderName: normalizeText(row.senderName),
    senderPhone: normalizeText(row.senderPhone),
    senderAddress: normalizeText(row.senderAddress),
    receiverName: normalizeText(row.receiverName),
    receiverPhone: normalizeText(row.receiverPhone),
    receiverAddress: normalizeText(row.receiverAddress),
    weight: Number(row.weight),
    quantity: Number(row.quantity),
    temperatureZone: normalizeText(row.temperatureZone),
    remark: normalizeText(row.remark) || undefined,
  }))
}

import * as XLSX from 'xlsx'
import type { OrderFormData } from '@/app/orders/actions'

export type ColumnMapping = {
  systemField: keyof OrderFormData | 'IGNORE'
  excelHeader: string
}

export const SYSTEM_FIELDS = [
  { key: 'externalCode', label: '外部编码', required: false },
  { key: 'senderName', label: '发件人姓名', required: true },
  { key: 'senderPhone', label: '发件人电话', required: true },
  { key: 'senderAddress', label: '发件人地址', required: true },
  { key: 'receiverName', label: '收件人姓名', required: true },
  { key: 'receiverPhone', label: '收件人电话', required: true },
  { key: 'receiverAddress', label: '收件人地址', required: true },
  { key: 'weight', label: '重量 (kg)', required: true },
  { key: 'quantity', label: '件数', required: true },
  { key: 'temperatureZone', label: '温层', required: true, options: ['常温', '冷藏', '冷冻'] },
  { key: 'remark', label: '备注', required: false },
]

export function getHeadersHash(headers: string[]) {
  return headers.join('|')
}

export function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  headers.forEach(h => {
    // Basic fuzzy match
    const match = SYSTEM_FIELDS.find(sf => 
      h.includes(sf.label) || sf.label.includes(h) || 
      (sf.key === 'externalCode' && (h.includes('编码') || h.includes('单号') || h.includes('编号'))) ||
      (sf.key === 'senderName' && (h.includes('寄件人') && h.includes('名'))) ||
      (sf.key === 'senderPhone' && (h.includes('寄件人') && (h.includes('电话') || h.includes('手机') || h.includes('联系')))) ||
      (sf.key === 'senderAddress' && (h.includes('寄件人') && h.includes('地址'))) ||
      (sf.key === 'receiverName' && (h.includes('收货') && h.includes('名'))) ||
      (sf.key === 'receiverPhone' && (h.includes('收货') && (h.includes('电话') || h.includes('手机') || h.includes('联系')))) ||
      (sf.key === 'receiverAddress' && (h.includes('收货') && h.includes('地址')))
    )
    mapping[h] = match ? match.key : 'IGNORE'
  })
  return mapping
}

export async function parseExcelData(file: File): Promise<{ headers: string[], rawData: any[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('File read failed')
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Find the actual header row. Some templates have titles in row 1, and headers in row 2 or 3.
        // We convert to array of arrays first to inspect rows.
        const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        let headerRowIdx = 0
        let maxCols = 0
        // Heuristic: The row with the most string values is likely the header
        aoa.forEach((row, idx) => {
          if (idx > 10) return // Look only in first 10 rows
          const stringCols = row.filter(cell => typeof cell === 'string').length
          if (stringCols > maxCols) {
            maxCols = stringCols
            headerRowIdx = idx
          }
        })

        if (maxCols === 0) throw new Error('Cannot find valid headers')

        const headers = aoa[headerRowIdx].map(h => String(h || '').trim())
        
        // Extract data starting from the row after the header
        const rawData = []
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i]
          // Skip completely empty rows
          if (row.length === 0 || row.every(c => c === undefined || c === null || c === '')) continue
          
          const obj: any = {}
          headers.forEach((h, colIdx) => {
            if (h) obj[h] = row[colIdx]
          })
          rawData.push(obj)
        }
        resolve({ headers: headers.filter(h => !!h), rawData })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsBinaryString(file)
  })
}

// Convert raw JSON mapped with rule to Standard Order data, along with initial validation errors
export function transformAndValidate(rawData: any[], mapping: Record<string, string>, existingExternalCodes: string[]): { data: any[], errors: Record<number, Record<string, string>> } {
  const data: any[] = []
  const errors: Record<number, Record<string, string>> = {}
  const seenCodes = new Set<string>()

  rawData.forEach((row, idx) => {
    const rowNum = idx + 1 // 1-based index for display
    const mappedObj: any = { _rowNum: rowNum } // attach original row number for reference
    const rowErrors: Record<string, string> = {}

    // 1. Transform keys
    Object.keys(row).forEach(header => {
      const targetKey = mapping[header]
      if (targetKey && targetKey !== 'IGNORE') {
        mappedObj[targetKey] = row[header]
      }
    })

    // 2. Format values & Validate required
    SYSTEM_FIELDS.forEach(sf => {
      let val = mappedObj[sf.key]
      
      // Clean string
      if (typeof val === 'string') val = val.trim()
      
      // Type conversions
      if (sf.key === 'weight' && val !== undefined) {
        val = parseFloat(val)
      }
      if (sf.key === 'quantity' && val !== undefined) {
        val = parseInt(val, 10)
      }
      
      mappedObj[sf.key] = val

      // Validate Required
      if (sf.required && (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val)))) {
        rowErrors[sf.key] = '必填项缺失'
      } else if (val !== undefined && val !== null && val !== '') {
        // Specific format validations
        if ((sf.key === 'senderPhone' || sf.key === 'receiverPhone') && !/^1\d{10}$/.test(String(val).replace(/\D/g, ''))) {
           rowErrors[sf.key] = '电话格式错误 (需11位纯数字)'
        }
        if (sf.key === 'weight' && (typeof val !== 'number' || val <= 0)) {
           rowErrors[sf.key] = '必须为正数'
        }
        if (sf.key === 'quantity' && (!Number.isInteger(val) || val <= 0)) {
           rowErrors[sf.key] = '必须为正整数'
        }
        if (sf.key === 'temperatureZone' && sf.options && !sf.options.includes(String(val))) {
           rowErrors[sf.key] = '只能为：常温/冷藏/冷冻'
        }
      }
    })

    // Duplication Check for externalCode
    const extCode = mappedObj.externalCode
    if (extCode) {
      if (seenCodes.has(extCode)) {
        rowErrors.externalCode = '同批次内重复'
      } else if (existingExternalCodes.includes(String(extCode))) {
        rowErrors.externalCode = '数据库已存在该编码'
      }
      seenCodes.add(extCode)
    }

    data.push(mappedObj)
    if (Object.keys(rowErrors).length > 0) {
      errors[rowNum] = rowErrors
    }
  })

  return { data, errors }
}

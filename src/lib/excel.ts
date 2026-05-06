import * as XLSX from 'xlsx'
import type { PersonalTaskFormData } from '@/app/tasks/my/actions'

// Any type for raw database record
type RawTask = any

// Format date for Excel export
function fmtExcelDate(date: Date | null | undefined | string): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function exportTasksToExcel(tasks: RawTask[], filename = '任务列表.xlsx') {
  const data = tasks.map((task, index) => ({
    '序号': index + 1,
    '任务名称': task.name || '',
    '任务描述': task.description || '',
    '周期开始': fmtExcelDate(task.startTime),
    '周期结束': fmtExcelDate(task.endTime),
    '来源': task.source || '',
    '负责人': task.assignee || '',
    '协作人': task.collaborator || '',
    '紧急': task.urgency || '',
    '状态': task.status || '',
    '通知内容': task.notifyContent || '',
    '推送': task.sendNotify ? '是' : '否',
    '扩展字段': task.extFields || '',
    '创建人': task.createdBy || '',
    '创建时间': fmtExcelDate(task.createdAt),
    '修改人': task.updatedBy || '',
    '修改时间': fmtExcelDate(task.updatedAt)
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '任务')
  XLSX.writeFile(workbook, filename)
}

export async function parseExcelToTasks(file: File): Promise<PersonalTaskFormData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('File read failed')
        
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet)

        const tasks: PersonalTaskFormData[] = rawJson.map(row => ({
          name: row['任务名称'] || '未命名任务',
          description: row['任务描述'] || undefined,
          // Handle various excel date formats or string formats
          startTime: row['周期开始'] ? new Date(row['周期开始']).toISOString() : undefined,
          endTime: row['周期结束'] ? new Date(row['周期结束']).toISOString() : undefined,
          source: row['来源'] || undefined,
          urgency: row['紧急'] || '低',
          assignee: row['负责人'] || undefined,
          collaborator: row['协作人'] || undefined,
          status: row['状态'] || '待处理',
          notifyContent: row['通知内容'] || undefined,
          sendNotify: row['推送'] === '是',
          extFields: row['扩展字段'] || undefined,
        }))

        // Filter out completely empty rows
        const validTasks = tasks.filter(t => t.name !== '未命名任务' || Object.keys(t).length > 2)

        resolve(validTasks)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsBinaryString(file)
  })
}

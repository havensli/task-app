'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  SYSTEM_FIELDS,
  createEmptyRow,
  exportOrdersToExcel,
  findSimilarMapping,
  getHeadersHash,
  guessMapping,
  normalizeOrderRow,
  parseExcelData,
  resequenceRows,
  rowsToOrderFormData,
  transformRows,
  validateRows,
  type ImportedOrderRow,
  type OrderFieldKey,
  type ParseProgress,
  type ValidationErrors,
} from '@/lib/order-excel'
import {
  bulkCreateOrders,
  checkExternalCodes,
  getAllTemplateMappings,
  getTemplateMapping,
  saveTemplateMapping,
} from '@/app/orders/actions'

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'SUBMITTING' | 'RESULT'
type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  kind: ToastKind
  message: string
}

const DEFAULT_PROGRESS: ParseProgress = {
  percent: 0,
  current: 0,
  total: 0,
  message: '',
}

const PAGE_SIZE = 100

export default function UniversalImportWizard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [isPending, startTransition] = useTransition()

  const [step, setStep] = useState<Step>('UPLOAD')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [headersHash, setHeadersHash] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappingHint, setMappingHint] = useState('')

  const [tableData, setTableData] = useState<ImportedOrderRow[]>([])
  const [existingExternalCodes, setExistingExternalCodes] = useState<string[]>([])
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [flatErrors, setFlatErrors] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const [parseProgress, setParseProgress] = useState(DEFAULT_PROGRESS)
  const [submitProgress, setSubmitProgress] = useState(DEFAULT_PROGRESS)
  const [submitResult, setSubmitResult] = useState({ success: 0, fail: 0 })
  const [submitErrors, setSubmitErrors] = useState<string[]>([])
  const [toast, setToast] = useState<Toast | null>(null)

  const totalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE))
  const paginatedData = useMemo(
    () => tableData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, tableData],
  )
  const mappedValues = useMemo(() => Object.values(mapping), [mapping])
  const missingRequiredFields = useMemo(
    () => SYSTEM_FIELDS.filter(field => field.required && !mappedValues.includes(field.key)),
    [mappedValues],
  )

  const showToast = (kind: ToastKind, message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(current => (current?.message === message ? null : current)), 3200)
  }

  const validateAndSetRows = (rows: ImportedOrderRow[], existingCodes = existingExternalCodes) => {
    const normalizedRows = resequenceRows(rows.map(row => normalizeOrderRow(row)))
    const result = validateRows(normalizedRows, existingCodes)
    setTableData(normalizedRows)
    setErrors(result.errors)
    setFlatErrors(result.flatErrors)
    setPage(current => Math.min(Math.max(1, current), Math.max(1, Math.ceil(normalizedRows.length / PAGE_SIZE))))
    return result
  }

  const loadExistingCodes = async (rows: ImportedOrderRow[]) => {
    const codes = rows.map(row => row.externalCode).filter(Boolean).map(String)
    const existingCodes = codes.length > 0 ? await checkExternalCodes(codes) : []
    setExistingExternalCodes(existingCodes)
    return existingCodes
  }

  const preparePreview = async (sourceRows: Record<string, unknown>[], mapRule: Record<string, string>) => {
    setParseProgress(progress => ({ ...progress, message: '正在校验重复编码' }))
    const rows = transformRows(sourceRows, mapRule)
    const existingCodes = await loadExistingCodes(rows)
    const result = validateAndSetRows(rows, existingCodes)
    setStep('PREVIEW')
    showToast(result.flatErrors.length ? 'error' : 'success', result.flatErrors.length ? `发现 ${result.flatErrors.length} 个错误，请在预览页一次性修正` : '解析完成，数据校验通过')
  }

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setParseProgress({ percent: 1, current: 0, total: 0, message: '准备解析' })

    try {
      const parsed = await parseExcelData(uploadedFile, setParseProgress)
      setHeaders(parsed.headers)
      setRawData(parsed.rawData)

      const hash = getHeadersHash(parsed.headers)
      setHeadersHash(hash)

      const savedMapping = await getTemplateMapping(hash)
      if (savedMapping) {
        setMapping(savedMapping)
        setMappingHint(`已应用记忆模板：${parsed.sheetName} 第 ${parsed.headerRowNumber} 行表头`)
        await preparePreview(parsed.rawData, savedMapping)
        return
      }

      const storedMappings = await getAllTemplateMappings()
      const similar = findSimilarMapping(parsed.headers, storedMappings)
      if (similar) {
        setMapping(similar.mapping)
        setMappingHint(`已应用相似模板记忆，匹配度 ${Math.round(similar.score * 100)}%`)
        await saveTemplateMapping(hash, similar.mapping)
        await preparePreview(parsed.rawData, similar.mapping)
        return
      }

      const guessed = guessMapping(parsed.headers)
      setMapping(guessed)
      const guessedValues = Object.values(guessed)
      const missing = SYSTEM_FIELDS.filter(field => field.required && !guessedValues.includes(field.key))
      if (missing.length === 0) {
        setMappingHint(`已自动识别 ${parsed.headers.length} 个表头，可在预览前检查映射`)
      } else {
        setMappingHint(`自动识别后仍缺少：${missing.map(field => field.label).join('、')}`)
      }
      setStep('MAPPING')
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件解析失败，请检查格式'
      showToast('error', message)
      setStep('UPLOAD')
      setFile(null)
      setParseProgress(DEFAULT_PROGRESS)
    }
  }

  const handleMappingConfirm = async () => {
    await saveTemplateMapping(headersHash, mapping)
    await preparePreview(rawData, mapping)
  }

  const handleCellChange = (rowId: string, fieldKey: OrderFieldKey, value: string) => {
    const nextRows = tableData.map(row => (row._rowId === rowId ? { ...row, [fieldKey]: value } : row))
    validateAndSetRows(nextRows)
  }

  const moveFocus = (rowIndex: number, fieldIndex: number, direction: 'next' | 'down') => {
    const nextRowIndex = direction === 'down' ? rowIndex + 1 : rowIndex + (fieldIndex === SYSTEM_FIELDS.length - 1 ? 1 : 0)
    const nextFieldIndex = direction === 'down' ? fieldIndex : (fieldIndex + 1) % SYSTEM_FIELDS.length
    const nextRow = tableData[nextRowIndex]
    const nextField = SYSTEM_FIELDS[nextFieldIndex]
    if (!nextRow || !nextField) return
    cellRefs.current[`${nextRow._rowId}-${nextField.key}`]?.focus()
  }

  const deleteRow = (rowId: string) => {
    validateAndSetRows(tableData.filter(row => row._rowId !== rowId))
    showToast('info', '已删除该行')
  }

  const addRow = () => {
    const nextRows = [...tableData, createEmptyRow(tableData.length + 1)]
    validateAndSetRows(nextRows)
    setPage(Math.max(1, Math.ceil(nextRows.length / PAGE_SIZE)))
    showToast('info', '已新增空白行')
  }

  const refreshDuplicateCheck = async () => {
    const existingCodes = await loadExistingCodes(tableData)
    const result = validateAndSetRows(tableData, existingCodes)
    showToast(result.flatErrors.length ? 'error' : 'success', result.flatErrors.length ? `复查完成，仍有 ${result.flatErrors.length} 个错误` : '复查完成，无错误')
  }

  const handleExport = () => {
    exportOrdersToExcel(tableData)
    showToast('success', '已导出当前预览数据')
  }

  const handleSubmit = async () => {
    const existingCodes = await loadExistingCodes(tableData)
    const latest = validateAndSetRows(tableData, existingCodes)
    if (latest.flatErrors.length > 0) {
      showToast('error', '存在错误数据，请先修正后再提交')
      setStep('PREVIEW')
      return
    }
    if (tableData.length === 0) {
      showToast('error', '没有数据可提交')
      return
    }

    setStep('SUBMITTING')
    setSubmitErrors([])
    setSubmitProgress({ percent: 0, current: 0, total: tableData.length, message: '准备提交' })

    const orders = rowsToOrderFormData(tableData)
    const CHUNK_SIZE = 300
    let success = 0
    let fail = 0

    for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
      const chunk = orders.slice(i, i + CHUNK_SIZE)
      const result = await bulkCreateOrders(chunk)
      if (result.errors?.length) {
        setSubmitErrors(result.errors)
        setSubmitResult({ success, fail: fail + chunk.length })
        setSubmitProgress({
          percent: Math.round(((i + chunk.length) / orders.length) * 100),
          current: Math.min(i + chunk.length, orders.length),
          total: orders.length,
          message: '唯一校验未通过',
        })
        setStep('RESULT')
        showToast('error', result.errors[0])
        return
      }
      success += result.successCount
      fail += result.failCount
      const current = Math.min(i + chunk.length, orders.length)
      setSubmitProgress({
        percent: Math.round((current / orders.length) * 100),
        current,
        total: orders.length,
        message: '正在写入数据库',
      })
    }

    setSubmitResult({ success, fail })
    setStep('RESULT')
    showToast(fail > 0 ? 'error' : 'success', `提交完成：成功 ${success} 条，失败 ${fail} 条`)
  }

  const resetWizard = () => {
    setStep('UPLOAD')
    setFile(null)
    setHeaders([])
    setRawData([])
    setHeadersHash('')
    setMapping({})
    setMappingHint('')
    setTableData([])
    setExistingExternalCodes([])
    setErrors({})
    setFlatErrors([])
    setSubmitErrors([])
    setPage(1)
    setParseProgress(DEFAULT_PROGRESS)
    setSubmitProgress(DEFAULT_PROGRESS)
  }

  return (
    <div className="order-import-shell">
      {toast && <div className={`toast toast-${toast.kind}`}>{toast.message}</div>}

      {step === 'UPLOAD' && (
        <div className="wizard-container">
          <div
            className="upload-box"
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault()
              const uploadedFile = event.dataTransfer.files[0]
              if (uploadedFile) void handleFileUpload(uploadedFile)
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="upload-icon" aria-hidden="true">XLS</div>
            <h3>点击或拖拽 Excel 文件至此</h3>
            <p>支持 .xlsx / .xls，自动识别多模板，1000 条以上分批处理</p>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={event => {
                const uploadedFile = event.target.files?.[0]
                if (uploadedFile) void handleFileUpload(uploadedFile)
              }}
            />
          </div>

          {parseProgress.percent > 0 && (
            <ProgressBlock progress={parseProgress} />
          )}
        </div>
      )}

      {step === 'MAPPING' && (
        <div className="wizard-container">
          <div className="wizard-section-title">
            <h2>配置字段映射</h2>
            <p>{mappingHint || '请确认 Excel 列与系统字段的对应关系，保存后会作为模板记忆。'}</p>
          </div>

          <div className="mapping-grid">
            {headers.map(header => (
              <div className="mapping-row" key={header}>
                <div className="mapping-header" title={header}>{header}</div>
                <span className="mapping-arrow">→</span>
                <select
                  value={mapping[header] || 'IGNORE'}
                  onChange={event => setMapping(current => ({ ...current, [header]: event.target.value }))}
                >
                  <option value="IGNORE">不导入该列</option>
                  {SYSTEM_FIELDS.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label}{field.required ? ' *' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {missingRequiredFields.length > 0 && (
            <div className="error-summary compact">
              缺少必填字段映射：{missingRequiredFields.map(field => field.label).join('、')}
            </div>
          )}

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={resetWizard}>重新上传</button>
            <button className="btn btn-primary" disabled={isPending} onClick={() => startTransition(() => void handleMappingConfirm())}>
              保存映射并预览
            </button>
          </div>
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="wizard-container wizard-wide">
          <div className="preview-toolbar">
            <div>
              <h2>数据预览与编辑</h2>
              <p>
                共 {tableData.length} 条，{flatErrors.length > 0 ? `发现 ${flatErrors.length} 个错误` : '校验全部通过'}
                {file ? ` · ${file.name}` : ''}
              </p>
            </div>
            <div className="preview-actions">
              <button className="btn btn-secondary" onClick={addRow}>新增行</button>
              <button className="btn btn-secondary" onClick={handleExport}>导出 Excel</button>
              <button className="btn btn-secondary" disabled={isPending} onClick={() => startTransition(() => void refreshDuplicateCheck())}>
                复查重复
              </button>
              <button className="btn btn-secondary" onClick={resetWizard}>重新上传</button>
              <button className="btn btn-primary" disabled={flatErrors.length > 0 || isPending} onClick={() => startTransition(() => void handleSubmit())}>
                提交下单
              </button>
            </div>
          </div>

          {flatErrors.length > 0 && (
            <div className="error-summary">
              <div className="error-summary-title">全部错误</div>
              <div className="error-list">
                {flatErrors.slice(0, 80).map(error => <span key={error}>{error}</span>)}
                {flatErrors.length > 80 && <span>还有 {flatErrors.length - 80} 个错误，请继续在表格中查看红色单元格。</span>}
              </div>
            </div>
          )}

          <div className="excel-table-wrap">
            <table className="pt-table excel-table">
              <thead>
                <tr>
                  <th className="row-number-cell">行号</th>
                  {SYSTEM_FIELDS.map(field => (
                    <th key={field.key} style={{ width: field.width, minWidth: field.width }}>
                      {field.label}{field.required && <span className="required-star">*</span>}
                    </th>
                  ))}
                  <th className="row-action-cell">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, visibleIndex) => {
                  const rowErrors = errors[row._rowNum] || {}
                  const absoluteIndex = (page - 1) * PAGE_SIZE + visibleIndex
                  return (
                    <tr key={row._rowId} className={Object.keys(rowErrors).length > 0 ? 'row-has-error' : ''}>
                      <td className="row-number-cell">{row._rowNum}</td>
                      {SYSTEM_FIELDS.map((field, fieldIndex) => {
                        const message = rowErrors[field.key]
                        return (
                          <td key={field.key} className={message ? 'cell-has-error' : undefined}>
                            {field.options ? (
                              <select
                                ref={element => { cellRefs.current[`${row._rowId}-${field.key}`] = element as unknown as HTMLInputElement | null }}
                                value={String(row[field.key] ?? '')}
                                title={message}
                                className={`inline-edit-input ${message ? 'input-error' : ''}`}
                                onChange={event => handleCellChange(row._rowId, field.key, event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') moveFocus(absoluteIndex, fieldIndex, 'down')
                                  if (event.key === 'Tab' && !event.shiftKey) {
                                    event.preventDefault()
                                    moveFocus(absoluteIndex, fieldIndex, 'next')
                                  }
                                }}
                              >
                                <option value="">请选择</option>
                                {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                              </select>
                            ) : (
                              <input
                                ref={element => { cellRefs.current[`${row._rowId}-${field.key}`] = element }}
                                className={`inline-edit-input ${message ? 'input-error' : ''}`}
                                title={message}
                                value={String(row[field.key] ?? '')}
                                onChange={event => handleCellChange(row._rowId, field.key, event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') moveFocus(absoluteIndex, fieldIndex, 'down')
                                  if (event.key === 'Tab' && !event.shiftKey) {
                                    event.preventDefault()
                                    moveFocus(absoluteIndex, fieldIndex, 'next')
                                  }
                                }}
                              />
                            )}
                            {message && <div className="cell-error-text">{message}</div>}
                          </td>
                        )
                      })}
                      <td className="row-action-cell">
                        <button className="btn-icon danger" onClick={() => deleteRow(row._rowId)}>删除</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-pagination">
            <span>第 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, tableData.length)} 条 / 共 {tableData.length} 条</span>
            <div className="pt-page-controls">
              <button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>上一页</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>下一页</button>
            </div>
          </div>
        </div>
      )}

      {step === 'SUBMITTING' && (
        <div className="wizard-container">
          <div className="wizard-section-title centered">
            <h2>正在提交下单</h2>
            <p>数据正在分批写入数据库，请保持页面打开。</p>
          </div>
          <ProgressBlock progress={submitProgress} />
        </div>
      )}

      {step === 'RESULT' && (
        <div className="wizard-container result-panel">
          <div className="result-mark">完成</div>
          <h2>导入完成</h2>
          <p>成功 {submitResult.success} 条，失败 {submitResult.fail} 条</p>
          {submitErrors.length > 0 && (
            <div className="error-summary" style={{ marginTop: 18, textAlign: 'left' }}>
              <div className="error-summary-title">唯一校验失败</div>
              <div className="error-list">
                {submitErrors.map(error => <span key={error}>{error}</span>)}
              </div>
            </div>
          )}
          <div className="wizard-actions centered">
            <button className="btn btn-secondary" onClick={resetWizard}>继续导入</button>
            <button className="btn btn-primary" onClick={() => router.push('/orders')}>查看已导入运单</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProgressBlock({ progress }: { progress: ParseProgress }) {
  return (
    <div className="import-progress">
      <div className="progress-meta">
        <span>{progress.message || '处理中'}</span>
        <strong>{progress.percent}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="progress-count">
        {progress.total > 0 ? `${progress.current} / ${progress.total} 条` : '准备中'}
      </div>
    </div>
  )
}

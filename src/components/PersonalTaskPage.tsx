'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PersonalTaskModal from './PersonalTaskModal'
import {
  createPersonalTask,
  updatePersonalTask,
  deletePersonalTask,
  deletePersonalTasks,
  getPersonalTasks,
  getAllMatchedPersonalTasks,
  bulkCreatePersonalTasks,
  type PersonalTaskFormData,
  type TaskFilters,
} from '@/app/tasks/my/actions'
import { exportTasksToExcel, parseExcelToTasks } from '@/lib/excel'

export type PersonalTask = {
  id: number
  name: string
  description: string | null
  startTime: Date | null
  endTime: Date | null
  source: string | null
  urgency: string
  assignee: string | null
  collaborator: string | null
  status: string
  notifyContent: string | null
  sendNotify: boolean
  extFields: string | null
  createdBy: string | null
  updatedBy: string | null
  createdAt: Date
  updatedAt: Date
}

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' | 'edit' | 'view'; task?: PersonalTask }

export const STATUS_COLOR: Record<string, string> = {
  '待处理': 'tag-todo',
  '处理中': 'tag-doing',
  '已完成': 'tag-done',
  '已取消': 'tag-cancelled',
}

export const URGENCY_COLOR: Record<string, string> = {
  '高': '#ef4444',
  '中': '#f59e0b',
  '低': '#22c55e',
}

export function fmt(date: Date | null | undefined): string {
  if (!date) return '--'
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const SOURCES  = ['', 'zcat', 'zcat平台', '手动创建', '系统自动']
const STATUSES = ['', '待处理', '处理中', '已完成', '已取消']
const PAGE_SIZES = [10, 20, 50, 100]

// ── Pagination component ────────────────────────────────────────────────────
function Pagination({
  page, totalPages, total, pageSize,
  onPage, onPageSize,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (p: number) => void
  onPageSize: (s: number) => void
}) {
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 4)           pages.push('…')
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) pages.push(i)
    if (page < totalPages - 3) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className="pagination">
      <span className="pg-info">共 {total} 条，第 {page}/{totalPages} 页</span>
      <div className="pg-controls">
        <button className="pg-btn" disabled={page === 1} onClick={() => onPage(1)}      aria-label="首页">«</button>
        <button className="pg-btn" disabled={page === 1} onClick={() => onPage(page-1)} aria-label="上一页">‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="pg-ellipsis">…</span>
            : <button key={p} className={`pg-btn ${p === page ? 'pg-active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        )}
        <button className="pg-btn" disabled={page === totalPages} onClick={() => onPage(page+1)} aria-label="下一页">›</button>
        <button className="pg-btn" disabled={page === totalPages} onClick={() => onPage(totalPages)} aria-label="末页">»</button>
      </div>
      <select className="pg-size-select" value={pageSize} onChange={e => onPageSize(Number(e.target.value))} aria-label="每页条数">
        {PAGE_SIZES.map(s => <option key={s} value={s}>每页 {s} 条</option>)}
      </select>
    </div>
  )
}

// ── Table header / row shared ────────────────────────────────────────────────
export function TaskTableHead({ onToggleAll, allSelected, indeterminate }: {
  onToggleAll: (v: boolean) => void
  allSelected: boolean
  indeterminate: boolean
}) {
  return (
    <thead>
      <tr>
        <th className="th-check">
          <input type="checkbox" id="check-all" checked={allSelected}
            ref={el => { if (el) el.indeterminate = indeterminate }}
            onChange={e => onToggleAll(e.target.checked)} />
        </th>
        <th>序号</th>
        <th>任务名称</th>
        <th>任务描述</th>
        <th>周期开始</th>
        <th>周期结束</th>
        <th>来源</th>
        <th>负责人</th>
        <th>协作人</th>
        <th>紧急</th>
        <th>状态</th>
        <th>通知内容</th>
        <th>推送</th>
        <th>创建时间</th>
        <th>创建人</th>
        <th>修改时间</th>
        <th>修改人</th>
        <th className="th-action">操作</th>
      </tr>
    </thead>
  )
}

export function TaskTableRow({
  task, idx, selected,
  onSelect, onEdit, onDelete, onView,
  isPending, detailHref,
}: {
  task: PersonalTask
  idx: number
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onView: () => void
  isPending: boolean
  detailHref: string
}) {
  return (
    <tr id={`task-row-${task.id}`} className={selected ? 'row-selected' : ''}>
      <td className="td-check">
        <input type="checkbox" id={`check-${task.id}`} checked={selected} onChange={onSelect} />
      </td>
      <td className="td-idx">{idx}</td>
      <td className="td-name">
        <Link href={detailHref} className="td-link" title={task.name}>{task.name}</Link>
      </td>
      <td className="td-desc">
        <span className="td-truncate" title={task.description ?? ''}>{task.description || '--'}</span>
      </td>
      <td className="td-date">{fmt(task.startTime)}</td>
      <td className="td-date">{fmt(task.endTime)}</td>
      <td>{task.source || '--'}</td>
      <td>{task.assignee || '--'}</td>
      <td>{task.collaborator || '--'}</td>
      <td>
        <span className="urgency-dot" style={{ color: URGENCY_COLOR[task.urgency] ?? 'var(--text-muted)' }}>
          ● {task.urgency}
        </span>
      </td>
      <td>
        <span className={`task-status-tag ${STATUS_COLOR[task.status] ?? 'tag-todo'}`}>{task.status}</span>
      </td>
      <td className="td-notify">
        <span className="td-truncate" title={task.notifyContent ?? ''}>{task.notifyContent || '--'}</span>
      </td>
      <td>
        <span className={task.sendNotify ? 'send-notify-yes' : 'send-notify-no'}>{task.sendNotify ? '是' : '否'}</span>
      </td>
      <td className="td-date">{fmt(task.createdAt)}</td>
      <td>{task.createdBy || '--'}</td>
      <td className="td-date">{fmt(task.updatedAt)}</td>
      <td>{task.updatedBy || '--'}</td>
      <td className="td-ops">
        <button className="op-btn op-edit"   id={`edit-${task.id}`}   onClick={onEdit}   title="编辑">编辑</button>
        <button className="op-btn op-delete" id={`delete-${task.id}`} onClick={onDelete} disabled={isPending} title="删除">删除</button>
        <button className="op-btn op-view"   id={`view-${task.id}`}   onClick={onView}   title="详情">详情</button>
      </td>
    </tr>
  )
}

// ── Filter bar ───────────────────────────────────────────────────────────────
interface FilterBarProps {
  filters: TaskFilters & { startTime?: string; endTime?: string }
  onChange: (f: TaskFilters & { startTime?: string; endTime?: string }) => void
  onSearch: () => void
  onReset: () => void
  isPending: boolean
}
export function FilterBar({ filters, onChange, onSearch, onReset, isPending }: FilterBarProps) {
  const set = (k: string, v: string) => onChange({ ...filters, [k]: v })
  return (
    <div className="pt-filter-bar">
      <div className="pt-filter-fields">
        <div className="pt-filter-item">
          <label className="pt-filter-label">任务名称</label>
          <input id="filter-name" className="pt-filter-input" placeholder="请输入"
            value={filters.name ?? ''} onChange={e => set('name', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()} />
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">任务周期</label>
          <div className="pt-filter-date-range">
            <div className="pt-date-icon-wrap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input id="filter-startTime" className="pt-filter-input date-input" type="datetime-local"
                value={filters.startTime ?? ''} onChange={e => set('startTime', e.target.value)} />
            </div>
            <span className="date-sep">-</span>
            <div className="pt-date-icon-wrap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input id="filter-endTime" className="pt-filter-input date-input" type="datetime-local"
                value={filters.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">负责人</label>
          <input id="filter-assignee" className="pt-filter-input" placeholder="请选择"
            value={filters.assignee ?? ''} onChange={e => set('assignee', e.target.value)} />
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">协作人</label>
          <input id="filter-collaborator" className="pt-filter-input" placeholder="请选择"
            value={filters.collaborator ?? ''} onChange={e => set('collaborator', e.target.value)} />
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">任务状态</label>
          <select id="filter-status" className="pt-filter-select"
            value={filters.status ?? ''} onChange={e => set('status', e.target.value)}>
            <option value="">请选择</option>
            {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="pt-filter-item">
          <label className="pt-filter-label">任务来源</label>
          <select id="filter-source" className="pt-filter-select"
            value={filters.source ?? ''} onChange={e => set('source', e.target.value)}>
            {SOURCES.map(s => <option key={s} value={s}>{s || '请选择'}</option>)}
          </select>
        </div>
      </div>
      <div className="pt-filter-actions">
        <button id="btn-search" className="btn btn-primary"  onClick={onSearch} disabled={isPending}>查询</button>
        <button id="btn-reset"  className="btn btn-secondary" onClick={onReset}  disabled={isPending}>重置</button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
interface PersonalTaskPageProps {
  initialItems: PersonalTask[]
  initialTotal: number
}

export default function PersonalTaskPage({ initialItems, initialTotal }: PersonalTaskPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tasks,      setTasks]      = useState<PersonalTask[]>(initialItems)
  const [total,      setTotal]      = useState(initialTotal)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(10)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 10))
  const [modal,      setModal]      = useState<ModalState>({ open: false })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isPending,  startTransition] = useTransition()
  const [filters, setFilters] = useState<TaskFilters & { startTime?: string; endTime?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-open create modal when ?create=1 (from sidebar "新建任务" link)
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setModal({ open: true, mode: 'create' })
      // Clean URL without reloading
      router.replace('/tasks/my', { scroll: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshTasks = useCallback(async (f?: typeof filters, p = page, ps = pageSize) => {
    const res = await getPersonalTasks(f ?? filters, p, ps)
    setTasks(res.items as PersonalTask[])
    setTotal(res.total)
    setTotalPages(res.totalPages)
    setPage(res.page)
    setSelectedIds(new Set())
  }, [filters, page, pageSize])

  const handleSearch = () => startTransition(async () => { await refreshTasks(filters, 1, pageSize) })
  const handleReset  = () => {
    setFilters({})
    startTransition(async () => { await refreshTasks({}, 1, pageSize) })
  }
  const handlePage     = (p: number) => startTransition(async () => { await refreshTasks(filters, p, pageSize) })
  const handlePageSize = (ps: number) => { setPageSize(ps); startTransition(async () => { await refreshTasks(filters, 1, ps) }) }

  const toggleAll = (v: boolean) => setSelectedIds(v ? new Set(tasks.map(t => t.id)) : new Set())
  const toggleOne = (id: number) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleCreate = async (data: PersonalTaskFormData) => { await createPersonalTask(data); await refreshTasks() }
  const handleEdit   = async (data: PersonalTaskFormData) => {
    if (modal.open && modal.task) { await updatePersonalTask(modal.task.id, data); await refreshTasks() }
  }
  const handleDelete = (id: number) => {
    if (!confirm('确定删除该任务吗？')) return
    startTransition(async () => { await deletePersonalTask(id); await refreshTasks() })
  }
  const handleBatchDelete = () => {
    if (!selectedIds.size || !confirm(`确定删除选中的 ${selectedIds.size} 条任务吗？`)) return
    startTransition(async () => { await deletePersonalTasks(Array.from(selectedIds)); await refreshTasks() })
  }

  const handleExport = () => {
    startTransition(async () => {
      try {
        const allTasks = await getAllMatchedPersonalTasks(filters)
        exportTasksToExcel(allTasks, '个人任务.xlsx')
      } catch (err) {
        alert('导出失败')
      }
    })
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset

    startTransition(async () => {
      try {
        const parsedData = await parseExcelToTasks(file)
        if (parsedData.length === 0) {
          alert('未解析到有效数据')
          return
        }
        await bulkCreatePersonalTasks(parsedData)
        alert(`成功导入 ${parsedData.length} 条任务`)
        await refreshTasks()
      } catch (err) {
        alert('导入失败，请检查文件格式')
      }
    })
  }

  const allSelected  = tasks.length > 0 && selectedIds.size === tasks.length
  const indeterminate = selectedIds.size > 0 && selectedIds.size < tasks.length
  const startIdx     = (page - 1) * pageSize

  return (
    <>
      {/* Tab bar */}
      <div className="tab-bar">
        <div className="tab" id="tab-home-link" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          首页
        </div>
        <div className="tab active" id="tab-my-tasks">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          个人任务
        </div>
        <div className="tab-actions">
          <button className="icon-btn" onClick={() => refreshTasks()} aria-label="刷新">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="pt-page">
        <FilterBar filters={filters} onChange={setFilters} onSearch={handleSearch} onReset={handleReset} isPending={isPending} />

        {/* Toolbar */}
        <div className="pt-toolbar">
          <div className="pt-toolbar-left">
            <button id="btn-create" className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create' })} disabled={isPending}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              新增
            </button>
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              导入
            </button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImport} />
            <button className="btn btn-secondary" onClick={handleExport} disabled={isPending}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              导出
            </button>
            <button id="btn-batch-delete" className="btn btn-danger-outline"
              onClick={handleBatchDelete} disabled={selectedIds.size === 0 || isPending}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              删除{selectedIds.size > 0 && <span className="badge" style={{ background: '#ef4444', marginLeft: 4 }}>{selectedIds.size}</span>}
            </button>
          </div>
          <div className="pt-toolbar-right">
            {isPending && <span className="pg-loading">加载中…</span>}
            <span className="pt-total-count">共 {total} 条</span>
          </div>
        </div>

        {/* Table */}
        <div className="pt-table-wrap">
          <table className="pt-table">
            <TaskTableHead onToggleAll={toggleAll} allSelected={allSelected} indeterminate={indeterminate} />
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={18} className="td-empty">
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    <p>暂无任务数据</p>
                    <button className="btn btn-primary" id="empty-create-btn" onClick={() => setModal({ open: true, mode: 'create' })}>立即新建</button>
                  </div>
                </td></tr>
              ) : tasks.map((task, i) => (
                <TaskTableRow
                  key={task.id} task={task} idx={startIdx + i + 1}
                  selected={selectedIds.has(task.id)}
                  onSelect={() => toggleOne(task.id)}
                  onEdit={()   => setModal({ open: true, mode: 'edit', task })}
                  onDelete={()  => handleDelete(task.id)}
                  onView={()   => setModal({ open: true, mode: 'view', task })}
                  isPending={isPending}
                  detailHref={`/tasks/my/${task.id}`}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <Pagination
            page={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={handlePage} onPageSize={handlePageSize}
          />
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <PersonalTaskModal
          mode={modal.mode}
          task={modal.mode !== 'create' ? modal.task : null}
          onClose={() => setModal({ open: false })}
          onSubmit={modal.mode === 'edit' ? handleEdit : handleCreate}
        />
      )}
    </>
  )
}

'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PersonalTaskModal from './PersonalTaskModal'
import {
  createPersonalTask, updatePersonalTask,
  deletePersonalTask, deletePersonalTasks,
  getAllPersonalTasks,
  type PersonalTaskFormData, type TaskFilters,
} from '@/app/tasks/my/actions'
import {
  FilterBar, TaskTableHead, TaskTableRow,
  STATUS_COLOR, URGENCY_COLOR,
  type PersonalTask,
} from './PersonalTaskPage'

type Stats = { total: number; pending: number; processing: number; done: number; cancelled: number }
type ModalState = { open: false } | { open: true; mode: 'create' | 'edit' | 'view'; task?: PersonalTask }

const PAGE_SIZES = [10, 20, 50, 100]

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="all-stat-card">
      <div className="all-stat-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div>
        <div className="all-stat-value" style={{ color }}>{value.toLocaleString()}</div>
        <div className="all-stat-label">{label}</div>
      </div>
    </div>
  )
}

function Pagination({
  page, totalPages, total, pageSize, onPage, onPageSize,
}: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  const pages: (number | '…')[] = []
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
  else {
    pages.push(1)
    if (page > 4) pages.push('…')
    for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) pages.push(i)
    if (page < totalPages - 3) pages.push('…')
    pages.push(totalPages)
  }
  return (
    <div className="pagination">
      <span className="pg-info">共 {total} 条，第 {page}/{totalPages} 页</span>
      <div className="pg-controls">
        <button className="pg-btn" disabled={page === 1} onClick={() => onPage(1)}>«</button>
        <button className="pg-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>‹</button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="pg-ellipsis">…</span>
          : <button key={p} className={`pg-btn ${p === page ? 'pg-active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        )}
        <button className="pg-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>›</button>
        <button className="pg-btn" disabled={page === totalPages} onClick={() => onPage(totalPages)}>»</button>
      </div>
      <select className="pg-size-select" value={pageSize} onChange={e => onPageSize(Number(e.target.value))}>
        {PAGE_SIZES.map(s => <option key={s} value={s}>每页 {s} 条</option>)}
      </select>
    </div>
  )
}

interface AllTasksPageProps {
  initialItems: PersonalTask[]
  initialTotal: number
  stats: Stats
}

export default function AllTasksPage({ initialItems, initialTotal, stats: initStats }: AllTasksPageProps) {
  const router = useRouter()
  const [tasks,      setTasks]      = useState<PersonalTask[]>(initialItems)
  const [total,      setTotal]      = useState(initialTotal)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(10)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 10))
  const [stats,      setStats]      = useState(initStats)
  const [modal,      setModal]      = useState<ModalState>({ open: false })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isPending,  startTransition] = useTransition()
  const [filters,    setFilters]    = useState<TaskFilters & { startTime?: string; endTime?: string }>({})

  const refreshTasks = useCallback(async (f?: typeof filters, p = page, ps = pageSize) => {
    const res = await getAllPersonalTasks(f ?? filters, p, ps)
    setTasks(res.items as PersonalTask[])
    setTotal(res.total)
    setTotalPages(res.totalPages)
    setPage(res.page)
    setSelectedIds(new Set())
  }, [filters, page, pageSize])

  const handleSearch   = () => startTransition(async () => { await refreshTasks(filters, 1, pageSize) })
  const handleReset    = () => { setFilters({}); startTransition(async () => { await refreshTasks({}, 1, pageSize) }) }
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

  const allSelected   = tasks.length > 0 && selectedIds.size === tasks.length
  const indeterminate = selectedIds.size > 0 && selectedIds.size < tasks.length
  const startIdx      = (page - 1) * pageSize

  return (
    <>
      {/* Tab bar */}
      <div className="tab-bar">
        <div className="tab" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          首页
        </div>
        <div className="tab active" id="tab-all-tasks">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          全部任务
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
        {/* Stats overview */}
        <div className="all-stats-row">
          <StatCard label="全部任务" value={stats.total} color="var(--primary)"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
          />
          <StatCard label="待处理" value={stats.pending} color="#f59e0b"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          />
          <StatCard label="处理中" value={stats.processing} color="#3b82f6"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
          />
          <StatCard label="已完成" value={stats.done} color="#22c55e"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
          />
          <StatCard label="已取消" value={stats.cancelled} color="#9ca3af"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
          />
          {/* Completion rate */}
          <div className="all-stat-card all-stat-rate">
            <div className="all-stat-label">完成率</div>
            <div className="all-stat-rate-value">
              {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%
            </div>
            <div className="all-rate-bar">
              <div className="all-rate-fill" style={{
                width: `${stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%`
              }} />
            </div>
          </div>
        </div>

        <FilterBar filters={filters} onChange={setFilters} onSearch={handleSearch} onReset={handleReset} isPending={isPending} />

        {/* Toolbar */}
        <div className="pt-toolbar">
          <div className="pt-toolbar-left">
            <button id="btn-create-all" className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create' })}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              新增
            </button>
            <button id="btn-batch-delete-all" className="btn btn-danger-outline"
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
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    </svg>
                    <p>暂无任务数据</p>
                    <button className="btn btn-primary" onClick={() => setModal({ open: true, mode: 'create' })}>立即新建</button>
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

        {total > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize}
            onPage={handlePage} onPageSize={handlePageSize} />
        )}
      </div>

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

'use client'

import { useState, useTransition } from 'react'
import { toggleTask, deleteTask, createTask } from '@/app/actions'
import { useRef } from 'react'

type Task = {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: Date
}

type Stats = {
  total: number
  completed: number
  pending: number
  overdue: number
}

interface HomeDashboardProps {
  tasks: Task[]
  stats: Stats
}

// Pending stat cards matching the prototype's "待处理事项"
const getPendingCards = (stats: Stats) => [
  {
    id: 'order',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    label: '待接单',
    category: '任务',
    value: stats.pending,
    color: 'var(--primary)',
  },
  {
    id: 'doing',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: '进行中',
    category: '延误预警',
    value: Math.max(0, stats.pending - stats.overdue),
    color: '#f59e0b',
  },
  {
    id: 'waiting',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    label: '待处理',
    category: '–',
    value: null,
    color: 'var(--text-muted)',
  },
  {
    id: 'review',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    label: '待审核',
    category: '改单确认',
    value: Math.floor(stats.pending * 0.3),
    color: 'var(--primary)',
  },
  {
    id: 'quality',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    label: '待处理',
    category: '品控',
    value: stats.overdue,
    color: 'var(--primary)',
  },
  {
    id: 'return',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
      </svg>
    ),
    label: '待登记',
    category: '回单',
    value: stats.completed,
    color: 'var(--primary)',
  },
]

// Status data for the traffic light section
const getStatusData = (stats: Stats) => {
  const scale = Math.max(stats.total, 10)
  return [
    {
      title: '待处理',
      highlight: true,
      rows: [
        { color: '#22c55e', count: Math.round(scale * 0.85) },
        { color: '#f59e0b', count: Math.round(scale * 0.11) },
        { color: '#ef4444', count: Math.round(scale * 0.04) },
      ],
    },
    {
      title: '进行中',
      rows: [
        { color: '#22c55e', count: Math.round(scale * 1.3) },
        { color: '#f59e0b', count: Math.round(scale * 1.1) },
        { color: '#ef4444', count: Math.round(scale * 0.04) },
      ],
    },
    {
      title: '待审核',
      rows: [
        { color: '#22c55e', count: Math.round(scale * 2.7) },
        { color: '#f59e0b', count: Math.round(scale * 0.45) },
        { color: '#ef4444', count: Math.round(scale * 0.07) },
      ],
    },
    {
      title: '已完成',
      rows: [
        { color: '#22c55e', count: stats.completed * 10 + 19 },
        { color: '#f59e0b', count: Math.round(stats.completed * 4.3) },
        { color: '#ef4444', count: Math.round(stats.completed * 0.55) },
      ],
    },
  ]
}

function getUpdateTime() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
}

function getTagClass(task: Task): string {
  if (task.completed) return 'task-status-tag tag-done'
  const days = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days > 7) return 'task-status-tag tag-overdue'
  if (days > 3) return 'task-status-tag tag-doing'
  return 'task-status-tag tag-todo'
}

function getTagText(task: Task): string {
  if (task.completed) return '已完成'
  const days = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days > 7) return '已逾期'
  if (days > 3) return '进行中'
  return '待处理'
}

function getPriorityColor(task: Task): string {
  if (task.completed) return '#22c55e'
  const days = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days > 7) return '#ef4444'
  if (days > 3) return '#f59e0b'
  return 'var(--primary)'
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function HomeDashboard({ tasks, stats }: HomeDashboardProps) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [updateTime] = useState(getUpdateTime)
  const formRef = useRef<HTMLFormElement>(null)

  const pendingCards = getPendingCards(stats)
  const statusData = getStatusData(stats)
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const recentTasks = tasks.slice(0, 6)
  const myTasks = tasks.slice(0, 5)

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createTask(formData)
      formRef.current?.reset()
      setShowForm(false)
    })
  }

  return (
    <>
      {/* Tab bar */}
      <div className="tab-bar">
        <button className="tab-bar-collapse" aria-label="折叠侧边栏">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="tab active" id="tab-home">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          首页
        </div>
        <div className="tab-actions">
          <button className="icon-btn" title="刷新" aria-label="刷新页面">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
          <button className="icon-btn" aria-label="更多操作">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button className="icon-btn" title="全屏" aria-label="全屏显示">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="content" id="main-content">
        {/* Pending items section */}
        <section>
          <div className="section-header">
            <h2 className="section-title">
              待处理事项
              <span style={{
                width: 16, height: 16,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                borderRadius: '50%',
                fontSize: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                cursor: 'pointer',
              }}>i</span>
            </h2>
            <span className="section-meta">最新更新时间：{updateTime}</span>
          </div>
          <div className="stat-grid">
            {pendingCards.map(card => (
              <div key={card.id} className="stat-card" id={`stat-${card.id}`}>
                <div className="stat-card-label">
                  <span style={{ color: card.color }}>{card.icon}</span>
                  {card.category}
                </div>
                <div className="stat-card-sub">{card.label}</div>
                {card.value === null ? (
                  <div className="stat-card-value muted">–</div>
                ) : (
                  <div className="stat-card-value" style={{ color: card.color }}>
                    {card.value.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Status traffic light + Target card */}
        <section style={{ display: 'flex', gap: 14 }}>
          <div className="status-board" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <h2 className="section-title" style={{ marginBottom: 0, marginRight: 16 }}>
                <span style={{ width: 3, height: 14, background: 'var(--primary)', borderRadius: 2, display: 'inline-block', marginRight: 8 }} />
                延误红绿灯
              </h2>
              <div className="status-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#22c55e' }} />
                  未预警
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#f59e0b' }} />
                  已延误
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#ef4444' }} />
                  严重延误
                </div>
                <a className="legend-link" href="#" id="view-province-list">查看省区列表&gt;&gt;</a>
              </div>
            </div>

            <div className="status-cols">
              {statusData.map((col, i) => (
                <div key={i} className={`status-col ${col.highlight ? 'highlight' : ''}`}>
                  <div className="status-col-title">{col.title}</div>
                  {col.rows.map((row, j) => (
                    <div key={j} className="status-row">
                      <div className="status-dot" style={{ background: row.color }} />
                      <div
                        className={`status-count ${row.color === '#22c55e' ? 'green' : row.color === '#f59e0b' ? 'orange' : 'red'}`}
                      >
                        {row.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Monthly target card */}
          <div className="target-card" id="monthly-target-card">
            <div className="target-card-label">本月任务目标(项)</div>
            <div className="target-card-value">{(stats.total * 10 + 100).toLocaleString()}</div>
            <div className="target-card-sub">
              <span>
                <strong>{stats.completed.toLocaleString()}</strong>
                已完成
              </span>
              <span>
                <strong>{stats.pending.toLocaleString()}</strong>
                未完成
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="progress-label">{completionRate}%</div>
          </div>
        </section>

        {/* Bottom panels */}
        <section className="bottom-panels">
          {/* Recent Tasks */}
          <div className="panel" id="recent-tasks-panel">
            <div className="panel-title">
              <div className="panel-title-bar" />
              最新任务
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>
                查看全部
              </span>
            </div>
            {recentTasks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
                暂无任务，点击下方按钮新建
              </p>
            ) : (
              recentTasks.map(task => (
                <div key={task.id} className="task-row" id={`task-row-${task.id}`}>
                  <div className="task-priority" style={{ background: getPriorityColor(task) }} />
                  <span className={`task-row-title ${task.completed ? 'done' : ''}`}>{task.title}</span>
                  <span className={getTagClass(task)}>{getTagText(task)}</span>
                  <span className="task-row-meta">{formatDate(task.createdAt)}</span>
                </div>
              ))
            )}

            {/* Quick add button */}
            <div style={{ marginTop: 12 }}>
              {!showForm ? (
                <button
                  id="quick-add-task-btn"
                  onClick={() => setShowForm(true)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 8,
                    background: 'var(--primary-lighter)',
                    color: 'var(--primary)',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.18s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  快速新建任务
                </button>
              ) : (
                <form ref={formRef} action={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    name="title"
                    placeholder="任务标题"
                    required
                    autoFocus
                    id="new-task-title"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.18s',
                    }}
                  />
                  <input
                    name="description"
                    placeholder="描述（可选）"
                    id="new-task-description"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="submit"
                      disabled={isPending}
                      id="submit-task-btn"
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontWeight: 600,
                        opacity: isPending ? 0.6 : 1,
                        transition: 'opacity 0.18s',
                      }}
                    >
                      {isPending ? '提交中…' : '确认添加'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      id="cancel-task-btn"
                      style={{
                        padding: '8px 16px',
                        background: '#f0f4f7',
                        color: 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* My Tasks with actions */}
          <div className="panel" id="my-tasks-panel">
            <div className="panel-title">
              <div className="panel-title-bar" />
              我的任务
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>
                查看全部
              </span>
            </div>
            {myTasks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: 13 }}>
                暂无任务
              </p>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className="task-row" id={`my-task-${task.id}`}>
                  <button
                    onClick={() => startTransition(() => toggleTask(task.id, task.completed))}
                    disabled={isPending}
                    aria-label={task.completed ? '标记未完成' : '标记完成'}
                    style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      borderRadius: 4,
                      border: `2px solid ${task.completed ? '#22c55e' : 'var(--border)'}`,
                      background: task.completed ? '#22c55e' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'all 0.18s',
                    }}
                  >
                    {task.completed && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </button>
                  <span className={`task-row-title ${task.completed ? 'done' : ''}`}>{task.title}</span>
                  {task.description && (
                    <span className="task-row-meta" style={{ maxWidth: 80 }}>{task.description.slice(0, 8)}{task.description.length > 8 ? '…' : ''}</span>
                  )}
                  <button
                    onClick={() => startTransition(() => deleteTask(task.id))}
                    disabled={isPending}
                    aria-label="删除任务"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '2px 4px',
                      borderRadius: 4,
                      transition: 'color 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                </div>
              ))
            )}

            {/* Stats summary */}
            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'var(--primary-lighter)',
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-around',
            }}>
              {[
                { label: '全部', value: stats.total, color: 'var(--foreground)' },
                { label: '进行中', value: stats.pending, color: '#f59e0b' },
                { label: '已完成', value: stats.completed, color: '#22c55e' },
                { label: '已逾期', value: stats.overdue, color: '#ef4444' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

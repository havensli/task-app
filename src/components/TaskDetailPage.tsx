'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import PersonalTaskModal from './PersonalTaskModal'
import { updatePersonalTask, deletePersonalTask, type PersonalTaskFormData } from '@/app/tasks/my/actions'
import { STATUS_COLOR, URGENCY_COLOR, fmt } from './PersonalTaskPage'

type PersonalTask = {
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

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`detail-field${wide ? ' detail-field-wide' : ''}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? '--'}</span>
    </div>
  )
}

export default function TaskDetailPage({ task: initialTask }: { task: PersonalTask }) {
  const router = useRouter()
  const [task, setTask] = useState(initialTask)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleEdit = async (data: PersonalTaskFormData) => {
    await updatePersonalTask(task.id, data)
    // Refetch by navigating to self (force-dynamic)
    router.refresh()
    setEditing(false)
  }

  const handleDelete = () => {
    if (!confirm('确定删除该任务吗？此操作不可恢复。')) return
    startTransition(async () => {
      await deletePersonalTask(task.id)
      router.push('/tasks/my')
    })
  }

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
        <div className="tab" style={{ cursor: 'pointer' }} onClick={() => router.push('/tasks/my')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          个人任务
        </div>
        <div className="tab active">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          任务详情
        </div>
        <div className="tab-actions">
          <button className="icon-btn" onClick={() => router.back()} title="返回" aria-label="返回">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="detail-page">
        {/* Header card */}
        <div className="detail-header-card">
          <div className="detail-header-left">
            <div className="detail-task-id">#{task.id}</div>
            <div>
              <h1 className="detail-task-name">{task.name}</h1>
              {task.description && <p className="detail-task-desc">{task.description}</p>}
            </div>
          </div>
          <div className="detail-header-right">
            <span className={`task-status-tag detail-status-tag ${STATUS_COLOR[task.status] ?? 'tag-todo'}`}>{task.status}</span>
            <button id="detail-edit-btn" className="btn btn-primary" onClick={() => setEditing(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              编辑
            </button>
            <button id="detail-delete-btn" className="btn btn-danger-outline" onClick={handleDelete} disabled={isPending}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              删除
            </button>
            <button className="btn btn-secondary" onClick={() => router.push('/tasks/my')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              返回列表
            </button>
          </div>
        </div>

        {/* Info panels */}
        <div className="detail-panels">
          {/* Basic info */}
          <div className="detail-panel">
            <div className="panel-title">
              <div className="panel-title-bar" />
              基本信息
            </div>
            <div className="detail-fields-grid">
              <Field label="任务名称"   value={task.name} />
              <Field label="任务来源"   value={task.source} />
              <Field label="任务状态"   value={
                <span className={`task-status-tag ${STATUS_COLOR[task.status] ?? 'tag-todo'}`}>{task.status}</span>
              } />
              <Field label="紧急程度"   value={
                <span style={{ color: URGENCY_COLOR[task.urgency] ?? 'var(--text-muted)', fontWeight: 600 }}>
                  ● {task.urgency}
                </span>
              } />
              <Field label="周期开始"   value={fmt(task.startTime)} />
              <Field label="周期结束"   value={fmt(task.endTime)} />
              <Field label="负责人"     value={task.assignee} />
              <Field label="协作人"     value={task.collaborator} />
              <Field label="任务描述"   value={task.description} wide />
            </div>
          </div>

          {/* Notify info */}
          <div className="detail-panel">
            <div className="panel-title">
              <div className="panel-title-bar" />
              通知配置
            </div>
            <div className="detail-fields-grid">
              <Field label="是否推送消息" value={
                <span className={task.sendNotify ? 'send-notify-yes' : 'send-notify-no'}>
                  {task.sendNotify ? '是' : '否'}
                </span>
              } />
              <Field label="通知内容" value={task.notifyContent} wide />
              <Field label="扩展字段" value={task.extFields} wide />
            </div>
          </div>

          {/* Audit info */}
          <div className="detail-panel">
            <div className="panel-title">
              <div className="panel-title-bar" />
              操作记录
            </div>
            <div className="detail-fields-grid">
              <Field label="创建人"   value={task.createdBy} />
              <Field label="创建时间" value={fmt(task.createdAt)} />
              <Field label="修改人"   value={task.updatedBy} />
              <Field label="修改时间" value={fmt(task.updatedAt)} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <PersonalTaskModal
          mode="edit"
          task={task}
          onClose={() => setEditing(false)}
          onSubmit={handleEdit}
        />
      )}
    </>
  )
}

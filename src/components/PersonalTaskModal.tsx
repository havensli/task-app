'use client'

import { useEffect, useRef, useState } from 'react'
import type { PersonalTaskFormData } from '@/app/tasks/my/actions'

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

interface PersonalTaskModalProps {
  mode: 'create' | 'edit' | 'view'
  task?: PersonalTask | null
  onClose: () => void
  onSubmit: (data: PersonalTaskFormData) => Promise<void>
}

function fmt(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const URGENCY_OPTIONS = ['高', '中', '低']
const STATUS_OPTIONS = ['待处理', '处理中', '已完成', '已取消']
const SOURCE_OPTIONS = ['zcat', 'zcat平台', '手动创建', '系统自动']
const NOTIFY_OPTIONS = ['是', '否']

export default function PersonalTaskModal({ mode, task, onClose, onSubmit }: PersonalTaskModalProps) {
  const isReadonly = mode === 'view'
  const title = mode === 'create' ? '新建' : mode === 'edit' ? '编辑' : '详情'
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<PersonalTaskFormData>({
    name: task?.name ?? '',
    description: task?.description ?? '',
    startTime: task?.startTime ? fmt(task.startTime) : '',
    endTime: task?.endTime ? fmt(task.endTime) : '',
    source: task?.source ?? '',
    urgency: task?.urgency ?? '中',
    assignee: task?.assignee ?? '',
    collaborator: task?.collaborator ?? '',
    status: task?.status ?? '待处理',
    notifyContent: task?.notifyContent ?? '',
    sendNotify: task?.sendNotify ?? true,
    extFields: task?.extFields ?? '',
    createdBy: task?.createdBy ?? '管理员',
    updatedBy: '管理员',
  })

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (key: keyof PersonalTaskFormData, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isReadonly) { onClose(); return }
    setSubmitting(true)
    try {
      await onSubmit(form)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`${title}任务`}
    >
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} id="personal-task-form">
          <div className="modal-body">
            {/* Left column */}
            <div className="modal-col">
              <div className="form-row">
                <label className="form-label required">任务名称</label>
                <input
                  id="field-name"
                  className="form-input"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="请输入任务名称"
                  required
                  readOnly={isReadonly}
                />
              </div>

              <div className="form-row">
                <label className="form-label required">任务周期</label>
                <div className="form-date-range">
                  <div className="form-date-wrap">
                    <svg className="form-date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      id="field-startTime"
                      className="form-input date-input"
                      type="datetime-local"
                      value={form.startTime?.slice(0, 16) ?? ''}
                      onChange={e => set('startTime', e.target.value ? e.target.value + ':00' : '')}
                      readOnly={isReadonly}
                    />
                  </div>
                  <span className="date-sep">-</span>
                  <div className="form-date-wrap">
                    <svg className="form-date-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input
                      id="field-endTime"
                      className="form-input date-input"
                      type="datetime-local"
                      value={form.endTime?.slice(0, 16) ?? ''}
                      onChange={e => set('endTime', e.target.value ? e.target.value + ':00' : '')}
                      readOnly={isReadonly}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label required">任务紧急程度</label>
                <select
                  id="field-urgency"
                  className="form-select"
                  value={form.urgency}
                  onChange={e => set('urgency', e.target.value)}
                  disabled={isReadonly}
                >
                  {URGENCY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label required">负责人</label>
                <input
                  id="field-assignee"
                  className="form-input"
                  value={form.assignee ?? ''}
                  onChange={e => set('assignee', e.target.value)}
                  placeholder="请输入负责人"
                  readOnly={isReadonly}
                />
              </div>

              <div className="form-row">
                <label className="form-label">是否推送消息</label>
                <select
                  id="field-sendNotify"
                  className="form-select"
                  value={form.sendNotify ? '是' : '否'}
                  onChange={e => set('sendNotify', e.target.value === '是')}
                  disabled={isReadonly}
                >
                  {NOTIFY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">任务扩展字段</label>
                <textarea
                  id="field-extFields"
                  className="form-textarea"
                  value={form.extFields ?? ''}
                  onChange={e => set('extFields', e.target.value)}
                  placeholder="请输入任务扩展字段"
                  readOnly={isReadonly}
                  rows={3}
                />
              </div>
            </div>

            {/* Right column */}
            <div className="modal-col">
              <div className="form-row">
                <label className="form-label">任务描述</label>
                <input
                  id="field-description"
                  className="form-input"
                  value={form.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="请输入任务描述"
                  readOnly={isReadonly}
                />
              </div>

              <div className="form-row">
                <label className="form-label required">任务来源</label>
                <select
                  id="field-source"
                  className="form-select"
                  value={form.source ?? ''}
                  onChange={e => set('source', e.target.value)}
                  disabled={isReadonly}
                >
                  <option value="">请选择</option>
                  {SOURCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label required">任务状态</label>
                <select
                  id="field-status"
                  className="form-select"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  disabled={isReadonly}
                >
                  {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">协作人</label>
                <input
                  id="field-collaborator"
                  className="form-input"
                  value={form.collaborator ?? ''}
                  onChange={e => set('collaborator', e.target.value)}
                  placeholder="请选择协作人"
                  readOnly={isReadonly}
                />
              </div>

              <div className="form-row" style={{ flex: 1 }}>
                <label className="form-label">通知内容</label>
                <textarea
                  id="field-notifyContent"
                  className="form-textarea"
                  value={form.notifyContent ?? ''}
                  onChange={e => set('notifyContent', e.target.value)}
                  placeholder="请输入通知内容"
                  readOnly={isReadonly}
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose} id="modal-cancel-btn">
              取消
            </button>
            {!isReadonly && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                id="modal-submit-btn"
              >
                {submitting ? '提交中…' : '确定'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

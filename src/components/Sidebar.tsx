'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  label: string
  href?: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    label: '首页',
    href: '/',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: '任务管理',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    children: [
      { label: '我的任务', href: '/tasks/my' },
      { label: '全部任务', href: '/tasks/all' },
      { label: '新建任务', href: '/tasks/my?create=1' },
    ],
  },
  {
    label: '项目中心',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    children: [
      { label: '项目列表', href: '/projects' },
      { label: '看板视图', href: '/projects/board' },
    ],
  },
  {
    label: '团队协作',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    children: [
      { label: '成员管理', href: '/team/members' },
      { label: '部门管理', href: '/team/departments' },
    ],
  },
  {
    label: '统计报表',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    label: '系统设置',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
    ),
  },
  {
    label: '通知中心',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set(['任务管理']))
  const [search, setSearch] = useState('')

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const filteredItems = search
    ? navItems.filter(
        item =>
          item.label.includes(search) ||
          item.children?.some(c => c.label.includes(search))
      )
    : navItems

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">TM</div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-title">任务管理</span>
            <span className="logo-subtitle">TASK MANAGER</span>
          </div>
        )}
      </div>

      {/* Org selector */}
      {!collapsed && (
        <div className="sidebar-org" title="切换组织">
          <span className="sidebar-org-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',marginRight:5,verticalAlign:'middle'}}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            总部
          </span>
          <span className="sidebar-org-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="sidebar-search">
          <span className="sidebar-search-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="输入菜单名称"
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="sidebar-search-input"
          />
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {filteredItems.map(item => {
          const isActive = item.href ? pathname === item.href : false
          const isOpen = openMenus.has(item.label)

          if (item.children && !collapsed) {
            return (
              <div key={item.label}>
                <div
                  className={`nav-item ${isOpen ? 'open' : ''}`}
                  onClick={() => toggleMenu(item.label)}
                  role="button"
                  tabIndex={0}
                >
                  {item.icon}
                  <span className="nav-item-label">{item.label}</span>
                  <span className={`nav-chevron ${isOpen ? 'open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                </div>
                <div className={`nav-sub ${isOpen ? 'open' : ''}`}>
                  {item.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`nav-item ${pathname === child.href ? 'active' : ''}`}
                    >
                      <span className="nav-item-label">{child.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          }

          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span className="nav-item-label">{item.label}</span>}
            </Link>
          ) : (
            <div
              key={item.label}
              className="nav-item"
              role="button"
              tabIndex={0}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span className="nav-item-label">{item.label}</span>}
            </div>
          )
        })}
      </nav>

      {/* Toggle button at bottom */}
      <button
        className="nav-item"
        style={{ margin: '8px', flexShrink: 0 }}
        onClick={onToggle}
        aria-label={collapsed ? '展开菜单' : '收起菜单'}
        title={collapsed ? '展开菜单' : '收起菜单'}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
        >
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        {!collapsed && <span className="nav-item-label">收起菜单</span>}
      </button>
    </aside>
  )
}

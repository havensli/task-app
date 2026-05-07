'use client'

import { useEffect, useState } from 'react'
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
    label: '订单中心',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
    children: [
      { label: '全部运单', href: '/orders' },
      { label: '万能导入', href: '/orders/import' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<Set<string>>(() => new Set(['订单中心']))
  const [search, setSearch] = useState('')

  useEffect(() => {
    const activeParent = navItems.find(item =>
      item.children?.some(child => pathname === child.href || pathname.startsWith(`${child.href}/`))
    )
    if (!activeParent) return

    setOpenMenus(prev => {
      if (prev.has(activeParent.label)) return prev
      const next = new Set(prev)
      next.add(activeParent.label)
      return next
    })
  }, [pathname])

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
                      className={`nav-item ${pathname === child.href || pathname.startsWith(`${child.href}/`) ? 'active' : ''}`}
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

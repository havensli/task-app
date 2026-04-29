'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />
      <div className="main-area">
        <Header onSidebarToggle={() => setSidebarCollapsed(v => !v)} />
        {children}
      </div>
    </div>
  )
}

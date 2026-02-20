'use client'

import { DocsNav } from "./DocsNav"

export function DocsSidebar() {
  return (
    <div className="w-60 shrink-0 border-r border-border h-[calc(100vh-57px)] sticky top-[57px] hidden md:block overflow-y-auto bg-background">
      <div className="p-6">
        <DocsNav />
      </div>
    </div>
  )
}

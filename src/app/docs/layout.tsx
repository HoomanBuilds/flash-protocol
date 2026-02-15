import { DocsSidebar } from "@/components/docs/DocsSidebar"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen font-mono antialiased bg-background">
      <div className="flex-1 flex items-start">
        <DocsSidebar />
        <main className="relative py-6 px-6 md:px-10 flex-1 min-w-0">
          <div className="w-full max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border py-12 mt-24 relative z-10 bg-background">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-6 md:px-10">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FLASH PROTOCOL. ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-6 text-sm">
          <a href="https://github.com/HoomanBuilds/flash-protocol" target="_blank" rel="noopener noreferrer" className="hover:text-foreground text-muted-foreground transition-colors">GITHUB</a>
        </div>
      </div>
    </footer>
  )
}

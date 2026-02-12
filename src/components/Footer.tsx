export function Footer() {
  return (
    <footer className="border-t border-border py-12 mt-24 relative z-10 bg-background">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FLASH PROTOCOL. ALL RIGHTS RESERVED.
        </div>
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:text-foreground text-muted-foreground transition-colors">GITHUB</a>
          <a href="#" className="hover:text-foreground text-muted-foreground transition-colors">TWITTER</a>
          <a href="#" className="hover:text-foreground text-muted-foreground transition-colors">DISCORD</a>
        </div>
      </div>
    </footer>
  )
}

export default function ModeratorLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="moderator-layout">
        {/* Moderator sidebar/menu/etc */}
        {children}
      </div>
    )
  }
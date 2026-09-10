import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Bookmark, Database, Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const nav = [
  { to:"/", label:"Explore", icon: LayoutDashboard },
  { to:"/saved", label:"Saved Views", icon: Bookmark },
  { to:"/data", label:"Data Sources", icon: Database },
];

export function Shell({ children, onToggleMobile, mobileOpen }: { children: React.ReactNode; onToggleMobile?:()=>void; mobileOpen?:boolean }) {
  const [collapsed, setCollapsed] = React.useState(false);
  return (
    <div className="min-h-screen bg-background flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded-md">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className={cn("hidden md:flex flex-col border-r bg-card shrink-0 transition-all", collapsed? "w-[64px]" : "w-[220px]")}>
        <div className="h-[56px] flex items-center px-3 border-b gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-[13px]">◈</div>
          {!collapsed && <div className="flex-1 min-w-0"><div className="font-semibold text-sm leading-none">PRISMATIC</div><div className="text-[10px] tracking-widest text-muted-foreground uppercase">Analytics</div></div>}
          <button aria-label={collapsed? "Expand navigation":"Collapse navigation"} onClick={()=>setCollapsed(v=>!v)} className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent ml-auto">
            <Menu className="h-4 w-4 opacity-60" />
          </button>
        </div>
        <nav className="p-2 flex-1 space-y-1" aria-label="Primary">
          {nav.map(item=>{
            const Icon=item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({isActive})=> cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors", isActive? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground", collapsed && "justify-center px-2")}>
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </NavLink>
            );
          })}
        </nav>
        {!collapsed && <div className="p-3 border-t text-[11px] text-muted-foreground leading-relaxed">Local-first • No data leaves your browser</div>}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onToggleMobile} aria-hidden="true"/>
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-card border-r flex flex-col">
            <div className="h-[56px] flex items-center px-3 border-b justify-between">
              <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">◈</div><div><div className="font-semibold text-sm">PRISMATIC</div><div className="text-[10px] tracking-widest text-muted-foreground uppercase">Turn complex data into clear decisions.</div></div></div>
              <button onClick={onToggleMobile} aria-label="Close navigation" className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4"/></button>
            </div>
            <nav className="p-3 space-y-1">
              {nav.map(item=>{
                const Icon=item.icon;
                return <NavLink key={item.to} to={item.to} onClick={onToggleMobile} className={({isActive})=> cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-sm", isActive? "bg-primary text-primary-foreground":"hover:bg-accent")}> <Icon className="h-4 w-4"/>{item.label}</NavLink>
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}

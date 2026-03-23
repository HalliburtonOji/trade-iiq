import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";

interface PageShellProps {
  children: React.ReactNode;
}

const STORAGE_KEY = "tradeiq-sidebar-collapsed";

const PageShell = ({ children }: PageShellProps) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  if (isMobile) {
    return (
      <div className="mx-auto min-h-screen max-w-[480px] pb-20">
        {children}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SideNav collapsed={collapsed} onToggle={toggle} />
      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? "ml-16" : "ml-64"}`}>
        <div className="mx-auto max-w-6xl px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageShell;

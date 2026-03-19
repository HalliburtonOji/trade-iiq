import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";

interface PageShellProps {
  children: React.ReactNode;
}

const PageShell = ({ children }: PageShellProps) => {
  const isMobile = useIsMobile();

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
      <SideNav />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="mx-auto max-w-6xl px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageShell;

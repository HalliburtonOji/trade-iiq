import BottomNav from "./BottomNav";

interface PageShellProps {
  children: React.ReactNode;
}

const PageShell = ({ children }: PageShellProps) => (
  <div className="mx-auto min-h-screen max-w-[480px] pb-20">
    {children}
    <BottomNav />
  </div>
);

export default PageShell;

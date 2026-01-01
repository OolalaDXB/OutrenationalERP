import { ReactNode } from "react";
import { Header } from "./Header";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  onNavigate?: (path: string) => void;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, onNavigate, children }: PageLayoutProps) {
  return (
    <main className="flex-1 ml-[260px] min-h-screen">
      <Header title={title} subtitle={subtitle} onNavigate={onNavigate} />
      <div className="p-8">
        {children}
      </div>
    </main>
  );
}

import { ReactNode } from "react";
import { Header } from "./Header";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, showBack, onBack, children }: PageLayoutProps) {
  return (
    <main className="flex-1 ml-[260px] min-h-screen">
      <Header title={title} subtitle={subtitle} showBack={showBack} onBack={onBack} />
      <div className="p-8">
        {children}
      </div>
    </main>
  );
}

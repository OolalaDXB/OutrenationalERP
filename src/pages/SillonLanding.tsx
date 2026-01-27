import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Disc3 } from 'lucide-react';

export function SillonLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Disc3 className="w-9 h-9 text-white" />
            </div>
          </div>
          
          {/* Brand */}
          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Sillon
          </h1>
          
          {/* Tagline */}
          <p className="text-lg text-muted-foreground mb-12">
            L'ERP des distributeurs vinyle
          </p>
          
          {/* CTA */}
          <Button 
            size="lg" 
            onClick={() => navigate('/login')}
            className="px-8 py-6 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            Se connecter
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          © 2026 Sillon. Powered by Oolala.
        </p>
      </footer>
    </div>
  );
}

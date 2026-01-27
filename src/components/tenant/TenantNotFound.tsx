import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface TenantNotFoundProps {
  type?: 'not-found' | 'access-denied';
}

export function TenantNotFound({ type = 'not-found' }: TenantNotFoundProps) {
  const navigate = useNavigate();

  const isAccessDenied = type === 'access-denied';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {isAccessDenied ? 'Accès refusé' : 'Organisation introuvable'}
        </h1>
        
        <p className="text-muted-foreground mb-8">
          {isAccessDenied 
            ? "Vous n'avez pas les permissions nécessaires pour accéder à cette organisation."
            : "L'organisation demandée n'existe pas ou a été désactivée."
          }
        </p>
        
        <Button onClick={() => navigate('/login', { replace: true })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
}

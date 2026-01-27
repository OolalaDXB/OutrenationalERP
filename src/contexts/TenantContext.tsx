import { createContext, useContext, ReactNode } from 'react';

export interface TenantSettings {
  logo_url?: string | null;
  primary_color?: string;
  company_name?: string;
  contact_email?: string;
  footer_text?: string;
}

export interface TenantContextType {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  status: string;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ 
  value, 
  children 
}: { 
  value: TenantContextType; 
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within TenantProvider (inside TenantRouter)');
  }
  return context;
}

export function useTenantContextOptional(): TenantContextType | null {
  return useContext(TenantContext);
}

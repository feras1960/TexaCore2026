import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './LanguageProvider';
import { ThemeProvider } from './ThemeProvider';
import { InterfaceModeProvider } from './InterfaceModeProvider';
import { Toaster } from '@/components/ui/toaster';

// ═══════════════════════════════════════════════════════════════
// React Query Global Configuration
// ═══════════════════════════════════════════════════════════════
// staleTime: 5 min → Data considered "fresh" for 5 minutes
// gcTime: 30 min → Data stays in cache even when component unmounts
// refetchOnWindowFocus: false → No surprise refetches
// This ensures navigating between modules is INSTANT (from cache)
// ═══════════════════════════════════════════════════════════════
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes - data is "fresh"
      gcTime: 30 * 60 * 1000,          // 30 minutes - keep in cache after unmount
      refetchOnWindowFocus: false,      // Don't refetch when user returns to tab
      refetchOnReconnect: 'always',     // Always refetch on network reconnect
      retry: 1,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <ThemeProvider>
            <InterfaceModeProvider>
              {children}
              <Toaster />
            </InterfaceModeProvider>
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export * from './LanguageProvider';
export * from './ThemeProvider';
export * from './InterfaceModeProvider';

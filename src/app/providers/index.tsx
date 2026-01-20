import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './LanguageProvider';
import { ThemeProvider } from './ThemeProvider';
import { InterfaceModeProvider } from './InterfaceModeProvider';
import { Toaster } from '@/components/ui/toaster';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <InterfaceModeProvider>
            {children}
            <Toaster />
          </InterfaceModeProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export * from './LanguageProvider';
export * from './ThemeProvider';
export * from './InterfaceModeProvider';

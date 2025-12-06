"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toaster-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "sonner";
import { RTLProvider } from "@/components/providers/rtl-provider";
import { LanguageProvider } from "@/lib/contexts/language-context";
import { CurrencyProvider } from "@/lib/contexts/currency-context";
import { NavigationProvider } from "@/lib/contexts/navigation-context";
import { useEffect } from "react";

// Component to handle session loading states
const SessionHandler = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Log session status for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("Session status:", status, "Session:", session);
    }
  }, [session, status]);

  return <>{children}</>;
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider
      refetchInterval={0} // Disable automatic refetching
      refetchOnWindowFocus={false} // Disable refetch on window focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      <SessionHandler>
        <QueryProvider>
          <NavigationProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <RTLProvider>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem={false}
                    disableTransitionOnChange
                  >
                    <ToastProvider />
                    {children}
                    <Toaster />
                  </ThemeProvider>
                </RTLProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </NavigationProvider>
        </QueryProvider>
      </SessionHandler>
    </SessionProvider>
  );
}; 
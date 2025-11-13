"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

export const NavigationLoading = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Start loading
    setIsLoading(true);

    // Complete loading after a short delay (route has changed)
    const completeTimer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [pathname, searchParams]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Loading Card */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300 border border-gray-100">
        {/* Spinner Container with gradient ring */}
        <div className="relative">
          {/* Outer gradient ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#211FC3] via-purple-500 to-pink-500 blur-lg opacity-40 animate-pulse" />
          
          {/* Inner spinning loader */}
          <div className="relative bg-white rounded-full p-4">
            <Loader2 className="h-14 w-14 text-[#211FC3] animate-spin" strokeWidth={2.5} />
          </div>
        </div>

        {/* Loading Text with gradient */}
        <div className="text-center space-y-1">
          <p className="text-base font-bold bg-gradient-to-r from-[#211FC3] to-purple-600 bg-clip-text text-transparent">
            {t('common.loading')}
          </p>
          <p className="text-xs text-gray-500">
            {t('common.pleaseWait')}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-[#211FC3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};


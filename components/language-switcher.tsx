"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { Languages } from "lucide-react";
import { useState, useEffect } from "react";

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLanguage);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">EN</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">
          {language === 'ar' ? 'EN' : 'عربي'}
        </span>
      </Button>
    </div>
  );
};

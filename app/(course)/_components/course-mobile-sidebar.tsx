"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { CourseSidebar } from "./course-sidebar";
import { DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/contexts/language-context";

export const CourseMobileSidebar = () => {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="md:hidden pl-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-md">
          <Menu className="h-6 w-6" />
        </div>
      </div>
    );
  }
  
  return (
    <Sheet>
      <SheetTrigger className="md:hidden pl-4 hover:opacity-75 transition">
        <div className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-slate-100">
          <Menu className="h-6 w-6" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-72">
        <DialogTitle className="sr-only">{t('student.courseMenu')}</DialogTitle>
        <CourseSidebar />
      </SheetContent>
    </Sheet>
  );
}; 
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { DashboardContent } from "./dashboard-content";
import { useLanguage } from "@/lib/contexts/language-context";
import { Loader2 } from "lucide-react";

export const DashboardWrapper = () => {
  const { t } = useLanguage();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: async () => {
      const { data } = await axios.get('/api/dashboard/student');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#211FC3] animate-spin mx-auto" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-red-500">{t('common.error')}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <DashboardContent
      user={data.user}
      lastWatchedChapter={data.lastWatchedChapter}
      studentStats={data.studentStats}
      coursesWithProgress={data.coursesWithProgress}
    />
  );
};


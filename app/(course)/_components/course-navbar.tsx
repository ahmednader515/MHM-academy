"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ChevronRight, LogOut, Star } from "lucide-react";
import { CourseMobileSidebar } from "./course-mobile-sidebar";
import { UserButton } from "@/components/user-button";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Badge } from "@/components/ui/badge";

export const CourseNavbar = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const { t } = useLanguage();

  // Fetch user points from API
  const fetchUserPoints = async () => {
    if (session?.user && session.user.role === "USER") {
      try {
        const response = await fetch('/api/user/points');
        if (response.ok) {
          const userData = await response.json();
          setUserPoints(userData.points);
        }
      } catch (error) {
        console.error('Error fetching user points:', error);
      }
    }
  };

  useEffect(() => {
    fetchUserPoints();
  }, [session]);

  // Listen for points updates
  useEffect(() => {
    const handlePointsUpdate = () => {
      fetchUserPoints();
    };

    window.addEventListener('pointsUpdated', handlePointsUpdate);
    return () => {
      window.removeEventListener('pointsUpdated', handlePointsUpdate);
    };
  }, [session]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Call our logout API to end the session
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      // Then sign out from NextAuth
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="px-2 sm:px-4 h-full flex items-center gap-1 sm:gap-2 bg-card text-foreground border-b shadow-sm overflow-hidden">
      <div className="flex items-center min-w-0 shrink">
        <CourseMobileSidebar />
        <Button
          onClick={handleBackToDashboard}
          variant="ghost"
          size="sm"
          className="flex items-center gap-x-1 sm:gap-x-2 hover:bg-slate-100 rtl:mr-1 ltr:ml-1 px-1.5 sm:px-3 min-w-0 h-8 sm:h-9"
        >
          <span className="text-[11px] sm:text-sm rtl:text-right ltr:text-left truncate max-w-[7.5rem] sm:max-w-none">
            {t('student.backToCourses')}
          </span>
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rtl:rotate-180" />
        </Button>
      </div>
      <div className="flex items-center gap-x-0.5 sm:gap-x-3 rtl:mr-auto ltr:ml-auto shrink-0">
        {/* Points display for students */}
        {session?.user && session.user.role === "USER" && userPoints !== null && (
          <Badge variant="secondary" className="hidden md:flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-2.5">
            <Star className="h-3 w-3 shrink-0" />
            <span className="tabular-nums">{userPoints}</span>
            <span>{t('navigation.points') || 'Points'}</span>
          </Badge>
        )}
        
        {session?.user && (
          <LoadingButton 
            size="sm" 
            variant="ghost" 
            onClick={handleLogout}
            loading={isLoggingOut}
            loadingText={t('student.loggingOut')}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out px-1.5 sm:px-3 h-8 sm:h-9"
          >
            <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 rtl:ml-1 sm:rtl:ml-2 ltr:mr-1 sm:ltr:mr-2 shrink-0"/>
            <span className="text-[11px] sm:text-sm whitespace-nowrap">{t('student.logout')}</span>
          </LoadingButton>
        )}
        <div className="scale-90 sm:scale-100 origin-center">
          <UserButton />
        </div>
      </div>
    </div>
  );
}; 
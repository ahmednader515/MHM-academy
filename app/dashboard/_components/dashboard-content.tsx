"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, Clock, Trophy, Wallet, TrendingUp, BookOpen as BookOpenIcon, Star, HelpCircle, Ticket, Copy, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NewContentBanner } from "./new-content-banner";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPublished: boolean;
  targetFaculty?: string | null;
  targetLevel?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Purchase = {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
};

type LastWatchedChapter = {
  id: string;
  title: string;
  courseId: string;
  position: number;
  chapter: {
    id: string;
    title: string;
    position: number;
    course: {
      title: string;
      imageUrl?: string | null;
    };
  };
};

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
};

interface DashboardContentProps {
  user: { balance?: number | null; points?: number | null } | null;
  lastWatchedChapter: LastWatchedChapter | null;
  studentStats: StudentStats;
  coursesWithProgress: CourseWithProgress[];
}

export const DashboardContent = ({ 
  user, 
  lastWatchedChapter, 
  studentStats, 
  coursesWithProgress 
}: DashboardContentProps) => {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const router = useRouter();
  const [promocode, setPromocode] = useState<any>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [loadingPromocode, setLoadingPromocode] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPromocode();
  }, []);

  const fetchPromocode = async () => {
    try {
      const response = await fetch('/api/user/promocode');
      if (response.ok) {
        const data = await response.json();
        setPromocode(data.promocode);
        setHasPendingRequest(data.hasPendingRequest || false);
      }
    } catch (error) {
      console.error('Error fetching promocode:', error);
    } finally {
      setLoadingPromocode(false);
    }
  };

  const handleRequestPromocode = async () => {
    try {
      const response = await fetch('/api/user/promocode', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success(t('dashboard.promocodeRequestSubmitted') || 'Promocode request submitted successfully');
        setHasPendingRequest(true);
        fetchPromocode(); // Refresh to get updated status
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || t('dashboard.promocodeRequestFailed') || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error requesting promocode:', error);
      toast.error(t('dashboard.promocodeRequestFailed') || 'Failed to submit request');
    }
  };

  const handleCopyCode = () => {
    if (promocode?.code) {
      navigator.clipboard.writeText(promocode.code);
      setCopied(true);
      toast.success(t('dashboard.promocodeCopied') || 'Promocode copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Points */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('dashboard.welcomeToDashboard')}</h1>
            <p className="text-muted-foreground">{t('dashboard.continueLearning')}</p>
          </div>
          {/* Points Display */}
          <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 min-w-[200px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-yellow-900 text-sm font-medium flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-900" />
                    {t('navigation.points')}
                  </p>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="focus:outline-none">
                          <HelpCircle className="h-4 w-4 text-yellow-900/70 hover:text-yellow-900 transition-colors cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-white text-gray-900 border-2 border-yellow-400 shadow-lg" side="bottom">
                        <div className="text-sm space-y-2 p-2">
                          <p className="font-semibold text-yellow-700 flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-600" />
                            {t('dashboard.howPointsWork')}
                          </p>
                          <div className="space-y-1.5">
                            <p className="text-xs">
                              <span className="font-medium">📚 {t('dashboard.earnPoints')}:</span> {t('dashboard.earnPointsDesc')}
                            </p>
                            <p className="text-xs">
                              <span className="font-medium">🎁 {t('dashboard.usePoints')}:</span> {t('dashboard.usePointsDesc')}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-3xl font-bold text-yellow-900 drop-shadow-lg">
                  {user?.points || 0}
                </p>
                {/* Promocode Section */}
                {!loadingPromocode && (
                  <div className="mt-4 pt-4 border-t border-yellow-700/40">
                    {promocode && !promocode.isUsed ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-white/30 backdrop-blur-sm rounded-lg p-2">
                          <Ticket className="h-4 w-4 text-yellow-900" />
                          <span className="text-sm text-yellow-900 font-medium">{t('dashboard.yourPromocode') || 'Your Promocode:'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white/40 backdrop-blur-sm text-yellow-900 font-mono text-sm px-3 py-2 rounded-lg font-bold">
                            {promocode.code}
                          </code>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCopyCode}
                            className="bg-white/30 hover:bg-white/40 text-yellow-900 border-yellow-700/30"
                          >
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {promocode.discountPercentage && (
                          <p className="text-xs font-medium text-yellow-900">
                            {promocode.discountPercentage}% {t('dashboard.discount') || 'خصم'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={handleRequestPromocode}
                        disabled={hasPendingRequest}
                        className="w-full bg-white/30 hover:bg-white/40 text-yellow-900 border-yellow-700/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        size="sm"
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        {hasPendingRequest 
                          ? (t('dashboard.promocodeRequestPending') || 'طلب كود الخصم قيد المراجعة')
                          : (t('dashboard.exchangePointsForPromocode') || 'استبدال النقاط بكود خصم')
                        }
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Content Banner */}
      <NewContentBanner />

      {/* Stats and Balance Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">{t('dashboard.currentBalance')}</p>
              <p className="text-2xl font-bold">{formatPrice(user?.balance || 0)}</p>
            </div>
            <Wallet className="h-8 w-8 text-orange-200" />
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">{t('dashboard.enrolledCourses')}</p>
              <p className="text-2xl font-bold">{studentStats.totalCourses}</p>
            </div>
            <BookOpenIcon className="h-8 w-8 text-green-200" />
          </div>
        </div>

        {/* Completed Chapters */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">{t('dashboard.completedChapters')}</p>
              <p className="text-2xl font-bold">{studentStats.completedChapters}</p>
            </div>
            <Trophy className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">{t('dashboard.averageScore')}</p>
              <p className="text-2xl font-bold">{studentStats.averageScore}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Last Watched Chapter - Big Square */}
      {lastWatchedChapter && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.lastWatched')}</h2>
          <div className="bg-card rounded-xl overflow-hidden border shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image Section */}
              <div className="relative h-64 lg:h-full">
                <Image
                  src={lastWatchedChapter.chapter.course.imageUrl || "/placeholder.png"}
                  alt={lastWatchedChapter.chapter.course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 flex flex-col justify-center">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {lastWatchedChapter.chapter.course.title}
                  </p>
                  <h3 className="text-2xl font-bold mb-2">
                    {lastWatchedChapter.chapter.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('home.chapter')} {lastWatchedChapter.chapter.position}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{t('dashboard.lastWatched')}</span>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90 text-white" 
                    size="lg"
                    asChild
                  >
                    <Link href={`/courses/${lastWatchedChapter.chapter.courseId}/chapters/${lastWatchedChapter.chapter.id}`}>
                      <Play className="h-4 w-4 ml-2" />
                      {t('dashboard.continueWatching')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">{t('dashboard.analytics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <BookOpenIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('home.chapters')}</p>
                <p className="text-2xl font-bold">{studentStats.totalChapters}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedChapters / Math.max(studentStats.totalChapters, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedChapters} {t('common.of')} {studentStats.totalChapters} {t('course.completed')}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('quiz.completed')}</p>
                <p className="text-2xl font-bold">{studentStats.completedQuizzes}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedQuizzes / Math.max(studentStats.totalQuizzes, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedQuizzes} {t('common.of')} {studentStats.totalQuizzes} {t('course.completed')}
            </p>
          </div>
        </div>
      </div>

      {/* My Courses Section */}
      <div>
        <h2 className="text-xl font-semibold mb-6">{t('dashboard.myCourses')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {coursesWithProgress.map((course) => (
            <div
              key={course.id}
              className="group bg-card rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="relative w-full aspect-[16/9]">
                <Image
                  src={course.imageUrl || "/placeholder.png"}
                  alt={course.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    {Math.round(course.progress)}%
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 min-h-[3rem] text-gray-900">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {course.chapters.length} {course.chapters.length === 1 ? t('home.chapter') : t('home.chapters')}
                      </span>
                    </div>
                    {course.quizzes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                        <span>
                          {course.quizzes.length} {course.quizzes.length === 1 ? t('home.quiz') : t('home.quizzes')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">{t('course.progress')}</span>
                      <span className="font-bold text-[#211FC3]">{Math.round(course.progress)}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-[#211FC3] to-[#211FC3]/80 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                    variant="default"
                    asChild
                  >
                    <Link href={course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                      {t('course.continue')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {coursesWithProgress.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.noCoursesYet')}</h3>
              <p className="text-muted-foreground mb-6">{t('home.startLearningJourney')}</p>
              <Button asChild className="bg-[#090919] hover:bg-[#090919]/90 text-white font-semibold">
                <Link href="/dashboard/search">
                  {t('dashboard.exploreCourses')}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Trophy, Video, Award, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import axios from "axios";

type NewContentItem = {
  id: string;
  type: 'chapter' | 'quiz' | 'livestream' | 'certificate';
  title: string;
  description?: string | null;
  courseId?: string;
  courseTitle?: string;
  courseImage?: string | null;
  assignerName?: string;
  imageUrl?: string;
  createdAt: string;
  scheduledAt?: string | null;
  isExpired?: boolean;
  link: string;
};

export const NewContentBanner = () => {
  const { t, language } = useLanguage();
  const [newContent, setNewContent] = useState<NewContentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNewContent = async () => {
      try {
        const response = await axios.get('/api/student/new-content');
        setNewContent(response.data.newContent);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching new content:', error);
        setIsLoading(false);
      }
    };

    fetchNewContent();
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % newContent.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + newContent.length) % newContent.length);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chapter':
        return <BookOpen className="h-5 w-5" />;
      case 'quiz':
        return <Trophy className="h-5 w-5" />;
      case 'livestream':
        return <Video className="h-5 w-5" />;
      case 'certificate':
        return <Award className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chapter':
        return t('newContent.newChapter');
      case 'quiz':
        return t('newContent.newQuiz');
      case 'livestream':
        return t('newContent.newLivestream');
      case 'certificate':
        return t('newContent.newCertificate');
      default:
        return t('newContent.newContent');
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'chapter':
        return 'from-blue-500 to-blue-600';
      case 'quiz':
        return 'from-green-500 to-green-600';
      case 'livestream':
        return 'from-purple-500 to-purple-600';
      case 'certificate':
        return 'from-yellow-500 to-amber-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (isLoading || newContent.length === 0) {
    return null;
  }

  const currentItem = newContent[currentIndex];

  return (
    <div className={`bg-gradient-to-r ${getTypeBgColor(currentItem.type)} rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden`}>
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">{t('newContent.title')}</h3>
          {newContent.length > 1 && (
            <span className="text-white/80 text-sm">
              ({currentIndex + 1}/{newContent.length})
            </span>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
          {/* Image/Icon */}
          <div className="flex-shrink-0">
            {currentItem.type === 'certificate' && currentItem.imageUrl ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-white/30">
                <Image
                  src={currentItem.imageUrl}
                  alt={currentItem.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : currentItem.courseImage ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-white/30">
                <Image
                  src={currentItem.courseImage}
                  alt={currentItem.courseTitle || ''}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                <div className="text-white">
                  {getIcon(currentItem.type)}
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                {getIcon(currentItem.type)}
                {getTypeLabel(currentItem.type)}
              </span>
              {currentItem.type === 'livestream' && currentItem.isExpired && (
                <span className="bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">
                  {t('admin.expired')}
                </span>
              )}
              <span className="text-white/80 text-xs">
                {format(new Date(currentItem.createdAt), 'PPP', { 
                  locale: language === 'ar' ? ar : undefined 
                })}
              </span>
            </div>

            <h4 className="text-lg font-bold text-white mb-1 line-clamp-1">
              {currentItem.title}
            </h4>

            {currentItem.courseTitle && (
              <p className="text-white/90 text-sm mb-2">
                {currentItem.courseTitle}
              </p>
            )}

            {currentItem.assignerName && (
              <p className="text-white/90 text-sm mb-2">
                {t('newContent.from')} {currentItem.assignerName}
              </p>
            )}

            {currentItem.description && (
              <p className="text-white/80 text-sm line-clamp-2 mb-3">
                {currentItem.description.replace(/<[^>]*>/g, '')}
              </p>
            )}

            <div className="flex items-center gap-2">
              {/* Only show button if not an expired livestream */}
              {!(currentItem.type === 'livestream' && currentItem.isExpired) && (
                <Button
                  asChild
                  size="sm"
                  className="bg-white text-gray-900 hover:bg-white/90 font-semibold"
                >
                  <Link href={currentItem.link}>
                    {currentItem.type === 'certificate' 
                      ? t('newContent.viewNow')
                      : t('newContent.checkItOut')}
                  </Link>
                </Button>
              )}

              {/* Navigation buttons for multiple items */}
              {newContent.length > 1 && (
                <div className="flex items-center gap-1 rtl:mr-auto ltr:ml-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePrev}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    {language === 'ar' ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleNext}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    {language === 'ar' ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


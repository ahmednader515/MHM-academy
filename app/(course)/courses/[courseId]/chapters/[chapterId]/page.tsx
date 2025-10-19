"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Lock, FileText, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { useLanguage } from "@/lib/contexts/language-context";

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  isFree: boolean;
  videoUrl: string | null;
  videoType: "UPLOAD" | "YOUTUBE" | null;
  youtubeVideoId: string | null;
  documentUrl: string | null;
  documentName: string | null;
  nextChapterId?: string;
  previousChapterId?: string;
  nextContentType?: 'chapter' | 'quiz' | null;
  previousContentType?: 'chapter' | 'quiz' | null;
  attachments?: {
    id: string;
    name: string;
    url: string;
    position: number;
    createdAt: Date;
  }[];
  userProgress?: {
    isCompleted: boolean;
  }[];
}

const ChapterPage = () => {
  const router = useRouter();
  const routeParams = useParams() as { courseId: string; chapterId: string };
  const { t, isRTL } = useLanguage();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [courseProgress, setCourseProgress] = useState(0);
  const [hasAccess, setHasAccess] = useState(false);

  console.log("🔍 ChapterPage render:", {
    chapterId: routeParams.chapterId,
    courseId: routeParams.courseId,
    hasChapter: !!chapter,
    chapterVideoUrl: chapter?.videoUrl,
    chapterVideoType: chapter?.videoType,
    loading,
    hasAccess
  });

  // Helper function to extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename) {
        // Decode URL encoding and handle special characters
        const decodedFilename = decodeURIComponent(filename);
        // Remove query parameters if any
        const cleanFilename = decodedFilename.split('?')[0];
        return cleanFilename || 'chapter-document';
      }
      return 'chapter-document';
    } catch {
      return 'chapter-document';
    }
  };

  // Helper function to download document
  const downloadDocument = async (url: string) => {
    try {
      const relative = `/api/courses/${routeParams.courseId}/chapters/${routeParams.chapterId}/document/download`;
      const absoluteUrl = typeof window !== 'undefined' ? new URL(relative, window.location.origin).toString() : relative;
      // Navigate directly to the download URL (more reliable for Android WebViews)
      window.location.href = absoluteUrl;
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open original URL
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper function to download attachment
  const downloadAttachment = async (url: string, name: string) => {
    try {
      // For uploadthing URLs, we'll use a different approach
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = name || getFilenameFromUrl(url);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(downloadUrl);
        toast.success(t('student.downloadStarted'));
      } else {
        throw new Error('Failed to fetch file');
      }
    } catch (error) {
      console.error('Download failed:', error);
      
      // If CORS fails or any other error, use the browser's native download behavior
      const link = document.createElement('a');
      link.href = url;
      link.download = name || getFilenameFromUrl(url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Try to trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t('student.fileOpenedInNewTab'));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log("🔍 ChapterPage fetchData started");
      try {
        const [chapterResponse, progressResponse, accessResponse] = await Promise.all([
          axios.get(`/api/courses/${routeParams.courseId}/chapters/${routeParams.chapterId}`),
          axios.get(`/api/courses/${routeParams.courseId}/progress`),
          axios.get(`/api/courses/${routeParams.courseId}/access`)
        ]);
        
        console.log("🔍 ChapterPage data fetched:", {
          chapterData: chapterResponse.data,
          progressData: progressResponse.data,
          accessData: accessResponse.data
        });
        
        setChapter(chapterResponse.data);
        setIsCompleted(chapterResponse.data.userProgress?.[0]?.isCompleted || false);
        setCourseProgress(progressResponse.data.progress);
        setHasAccess(accessResponse.data.hasAccess);
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("🔍 Error fetching data:", axiosError);
        if (axiosError.response) {
          console.error("🔍 Error response:", axiosError.response.data);
          toast.error(`${t('student.failedToLoadChapter')}: ${axiosError.response.data}`);
        } else if (axiosError.request) {
          console.error("🔍 Error request:", axiosError.request);
          toast.error(t('student.connectionFailed'));
        } else {
          console.error("🔍 Error message:", axiosError.message);
          toast.error(t('student.unknownError'));
        }
      } finally {
        console.log("🔍 ChapterPage fetchData completed, setting loading to false");
        setLoading(false);
      }
    };

    fetchData();
  }, [routeParams.courseId, routeParams.chapterId]);

  const toggleCompletion = async () => {
    try {
      if (isCompleted) {
        await axios.delete(`/api/courses/${routeParams.courseId}/chapters/${routeParams.chapterId}/progress`);
      } else {
        await axios.put(`/api/courses/${routeParams.courseId}/chapters/${routeParams.chapterId}/progress`);
      }
      setIsCompleted(!isCompleted);
      router.refresh();
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast.error(t('student.failedToUpdateProgress'));
    }
  };

  const onEnd = async () => {
    try {
      if (!isCompleted) {
        await axios.put(`/api/courses/${routeParams.courseId}/chapters/${routeParams.chapterId}/progress`);
        setIsCompleted(true);
        router.refresh();
      }
    } catch (error) {
      console.error("Error marking chapter as completed:", error);
      toast.error(t('student.failedToUpdateProgress'));
    }
  };

  const onNext = () => {
    if (chapter?.nextChapterId) {
      if (chapter.nextContentType === 'quiz') {
        router.push(`/courses/${routeParams.courseId}/quizzes/${chapter.nextChapterId}`);
      } else {
        router.push(`/courses/${routeParams.courseId}/chapters/${chapter.nextChapterId}`);
      }
    }
  };

  const onPrevious = () => {
    if (chapter?.previousChapterId) {
      if (chapter.previousContentType === 'quiz') {
        router.push(`/courses/${routeParams.courseId}/quizzes/${chapter.previousChapterId}`);
      } else {
        router.push(`/courses/${routeParams.courseId}/chapters/${chapter.previousChapterId}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{t('student.loading')}</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">{t('student.chapterNotFound')}</div>
      </div>
    );
  }

  if (!hasAccess && !chapter.isFree) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-semibold">{t('student.chapterLocked')}</h2>
          <p className="text-muted-foreground">{t('student.purchaseCourseToAccess')}</p>
          <Button onClick={() => router.push(`/courses/${routeParams.courseId}/purchase`)}>
            {t('student.purchaseCourse')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex flex-col gap-8">
          {/* Course Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('student.progress')}</span>
              <span className="text-sm font-medium">{courseProgress}%</span>
            </div>
            <Progress value={courseProgress} className="h-2" />
          </div>

          {/* Video Player Section */}
          <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
            {chapter.videoUrl ? (
              (() => {
                console.log("🔍 Rendering PlyrVideoPlayer with props:", {
                  videoUrl: chapter.videoType === "UPLOAD" ? chapter.videoUrl : undefined,
                  youtubeVideoId: chapter.videoType === "YOUTUBE" ? chapter.youtubeVideoId || undefined : undefined,
                  videoType: (chapter.videoType as "UPLOAD" | "YOUTUBE") || "UPLOAD",
                  key: `${chapter.id}-${chapter.videoUrl}-${chapter.videoType}`
                });
                return (
                  <PlyrVideoPlayer
                    key={`${chapter.id}-${chapter.videoUrl}-${chapter.videoType}`}
                    videoUrl={chapter.videoType === "UPLOAD" ? chapter.videoUrl : undefined}
                    youtubeVideoId={chapter.videoType === "YOUTUBE" ? chapter.youtubeVideoId || undefined : undefined}
                    videoType={(chapter.videoType as "UPLOAD" | "YOUTUBE") || "UPLOAD"}
                    className="w-full h-full"
                    onEnded={onEnd}
                    onTimeUpdate={(currentTime) => {
                      // Only log in development
                      if (process.env.NODE_ENV === 'development') {
                        console.log("🔍 Video time update:", currentTime);
                      }
                    }}
                  />
                );
              })()
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
{t('student.noVideoAvailable')}
              </div>
            )}
          </div>

          {/* Chapter Information */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{chapter.title}</h1>
              <Button
                variant="outline"
                onClick={toggleCompletion}
                className="flex items-center gap-2"
              >
                {isCompleted ? (
                  <>
                    <span>{t('student.markAsIncomplete')}</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </>
                ) : (
                  <>
                    <span>{t('student.markAsCompleted')}</span>
                    <Circle className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: chapter.description || "" }} />
            </div>
            
            {/* Attachments Section */}
            {(chapter.attachments && chapter.attachments.length > 0) && (
              <div className="mt-6 p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{t('student.chapterDocuments')}</h3>
                </div>
                <div className="space-y-2">
                  {chapter.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center p-3 w-full bg-secondary/50 border-secondary/50 border text-secondary-foreground rounded-md">
                      <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {attachment.name || getFilenameFromUrl(attachment.url)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t('student.chapterDocument')}</p>
                      </div>
                      <div className="mr-auto flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.url, '_blank')}
                        >
                          {t('student.view')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadAttachment(attachment.url, attachment.name)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          {t('student.download')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Legacy Document Section (for backward compatibility) */}
            {chapter.documentUrl && !chapter.attachments?.length && (
              <div className="mt-6 p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">{t('student.chapterDocument')}</h3>
                </div>
                <div className="flex items-center p-3 w-full bg-secondary/50 border-secondary/50 border text-secondary-foreground rounded-md">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {chapter.documentName || getFilenameFromUrl(chapter.documentUrl || '')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('student.chapterDocument')}</p>
                  </div>
                  <div className="mr-auto flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(chapter.documentUrl!, '_blank')}
                    >
                      {t('student.viewDocument')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDocument(chapter.documentUrl!).catch(console.error)}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      {t('student.download')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={!chapter.previousChapterId}
              className="flex items-center gap-2"
            >
              {isRTL ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
              {t('student.previousChapter')}
            </Button>

            <Button
              onClick={onNext}
              disabled={!chapter.nextChapterId}
              className="flex items-center gap-2"
            >
              {t('student.nextChapter')}
              {isRTL ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterPage; 
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, Pencil, Youtube, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { useLanguage } from "@/lib/contexts/language-context";

interface VideoFormProps {
    initialData: {
        videoUrl: string | null;
        videoType: string | null;
        youtubeVideoId: string | null;
    };
    courseId: string;
    chapterId: string;
}

export const VideoForm = ({
    initialData,
    courseId,
    chapterId
}: VideoFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onSubmitYouTube = async () => {
        if (!youtubeUrl.trim()) {
            toast.error(t('teacher.pleaseEnterYouTubeUrl'));
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ youtubeUrl }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to add YouTube video');
            }

            toast.success(t('teacher.youtubeVideoAddedSuccessfully'));
            setIsEditing(false);
            setYoutubeUrl("");
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_YOUTUBE]", error);
            toast.error(error instanceof Error ? error.message : t('teacher.errorOccurred'));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isMounted) {
        return null;
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t('teacher.chapterVideo')}
                <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
                    {isEditing ? (
                        <>{t('common.cancel')}</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('teacher.editVideo')}
                        </>
                    )}
                </Button>
            </div>

            {!isEditing && (
                <div className="relative aspect-video mt-2">
                    {initialData.videoUrl ? (
                        <PlyrVideoPlayer
                            videoUrl={initialData.videoType === "UPLOAD" ? initialData.videoUrl : undefined}
                            youtubeVideoId={initialData.videoType === "YOUTUBE" ? initialData.youtubeVideoId || undefined : undefined}
                            videoType={(initialData.videoType as "UPLOAD" | "YOUTUBE") || "YOUTUBE"}
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted rounded-md">
                            <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
            )}

            {isEditing && (
                <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Youtube className="h-4 w-4" />
                        {t('teacher.pasteYouTubeVideoLink')}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="youtube-url">{t('teacher.youtubeUrl')}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="youtube-url"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={onSubmitYouTube}
                                disabled={isSubmitting || !youtubeUrl.trim()}
                                className="flex items-center gap-2"
                            >
                                <Link className="h-4 w-4" />
                                {t('teacher.add')}
                            </Button>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {t('teacher.supportedLinks')}:
                        <br />
                        • https://www.youtube.com/watch?v=VIDEO_ID
                        <br />
                        • https://youtu.be/VIDEO_ID
                        <br />
                        • https://www.youtube.com/embed/VIDEO_ID
                    </div>
                </div>
            )}
        </div>
    )
}

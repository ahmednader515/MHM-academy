"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/contexts/language-context";

interface ActionsProps {
    disabled: boolean;
    courseId: string;
    isPublished: boolean;
}

export const Actions = ({
    disabled,
    courseId,
    isPublished,
}: ActionsProps) => {
    const { t } = useLanguage();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);

            if (isPublished) {
                await axios.patch(`/api/courses/${courseId}/unpublish`);
                toast.success(t('teacher.unpublishSuccess'));
            } else {
                await axios.patch(`/api/courses/${courseId}/publish`);
                toast.success(t('teacher.publishCourseSuccess'));
            }

            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    }

    const publishButton = (
        <Button
            onClick={onClick}
            disabled={disabled || isLoading}
            variant="outline"
            size="sm"
        >
            {isPublished ? (
                <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    {t('teacher.unpublish')}
                </>
            ) : (
                <>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('teacher.publishCourse')}
                </>
            )}
        </Button>
    );

    return (
        <div className="flex items-center gap-x-2">
            {disabled && !isPublished ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                {publishButton}
                                <Info className="h-4 w-4 absolute -top-1 -right-1 text-orange-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <div className="text-sm">
                                <p className="font-semibold mb-2">{t('teacher.cannotPublishCourseUntil')}:</p>
                                <ul className="space-y-1 text-xs">
                                    <li>• {t('teacher.addCourseTitle')}</li>
                                    <li>• {t('teacher.addCourseDescription')}</li>
                                    <li>• {t('teacher.addCourseImage')}</li>
                                    <li>• {t('teacher.setCoursePrice')} ({t('teacher.canBeFree')})</li>
                                    <li>• {t('teacher.addAtLeastOneChapterAndPublish')}</li>
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                publishButton
            )}
        </div>
    )
} 
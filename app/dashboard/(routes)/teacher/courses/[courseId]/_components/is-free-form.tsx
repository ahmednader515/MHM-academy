"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Pencil, Lock } from "lucide-react";
import { IconBadge } from "@/components/icon-badge";
import { useLanguage } from "@/lib/contexts/language-context";

const formSchema = z.object({
    isFree: z.boolean().default(false),
});

interface IsFreeFormProps {
    initialData: Course;
    courseId: string;
}

export const IsFreeForm = ({
    initialData,
    courseId
}: IsFreeFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            isFree: initialData.isFree || false,
        },
    });

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t('teacher.courseUpdatedSuccessfully'));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        } finally {
            setIsLoading(false);
        }
    }

    const router = useRouter();

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                    <IconBadge icon={Lock} />
                    {t('teacher.courseAccess')}
                </div>
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>{t('common.cancel')}</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('teacher.editAccess')}
                        </>
                    )}
                </Button>
            </div>
            {!isEditing && (
                <p className="text-sm mt-2">
                    {initialData.isFree ? t('teacher.courseIsFree') : t('teacher.courseIsPaid')}
                </p>
            )}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="isFree"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            {t('teacher.makeCourseFree')}
                                        </FormLabel>
                                        <FormDescription>
                                            {t('teacher.freeCourseDescription')}
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={isLoading}
                                type="submit"
                            >
                                {t('common.save')}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}

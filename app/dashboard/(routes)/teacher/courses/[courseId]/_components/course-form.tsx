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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Globe } from "lucide-react";
import { CurriculumSelector } from "@/components/curriculum-selector";

    const formSchema = z.object({
        title: z.string().min(1, {
            message: "العنوان مطلوب",
        }),
        description: z.string().min(1, {
            message: "الوصف مطلوب",
        }),
        targetCurriculum: z.string().optional(),
        targetLevel: z.string().optional(),
        targetLanguage: z.string().optional(),
        targetGrade: z.string().optional(),
    });

interface CourseFormProps {
    initialData: Course;
    courseId: string;
}

export const CourseForm = ({
    initialData,
    courseId
}: CourseFormProps) => {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || "",
            description: initialData.description || "",
            targetCurriculum: initialData.targetCurriculum || "",
            targetLevel: initialData.targetLevel || "",
            targetLanguage: initialData.targetLanguage || "",
            targetGrade: initialData.targetGrade || "",
        },
    });

    const toggleEdit = () => setIsEditing((current) => !current);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success("تم تحديث المادة");
            toggleEdit();
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    const onPublish = async () => {
        try {
            setIsLoading(true);
            await axios.patch(`/api/courses/${courseId}/publish`);
            toast.success(initialData.isPublished ? "تم إلغاء النشر" : "تم النشر");
            router.refresh();
        } catch {
            toast.error("حدث خطأ ما");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mt-6 border bg-slate-100 rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                إعدادات المادة
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل المادة
                        </>
                    )}
                </Button>
            </div>
            {!isEditing && (
                <div className="mt-4 space-y-4">
                    {/* Target Audience Display */}
                    {(initialData.targetFaculty || initialData.targetCollege) && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-slate-700">الجمهور المستهدف</h4>
                            <div className="flex flex-wrap gap-2">
                                {initialData.targetCollege && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                        {initialData.targetCollege}
                                    </span>
                                )}
                                {initialData.targetFaculty && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {initialData.targetFaculty}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            {initialData.isPublished ? "منشور" : "مسودة"}
                        </p>
                        <Button
                            onClick={onPublish}
                            disabled={isLoading}
                            variant={initialData.isPublished ? "destructive" : "default"}
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            {initialData.isPublished ? "إلغاء النشر" : "نشر"}
                        </Button>
                    </div>
                </div>
            )}
            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            disabled={isLoading}
                                            placeholder="e.g. 'تطوير الويب '"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>الوصف</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            disabled={isLoading}
                                            placeholder="e.g. 'هذه المادة سوف تعلمك...'"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-4">
                            <FormLabel>المنهج والمرحلة والصف المستهدفة (اختياري)</FormLabel>
        <CurriculumSelector
            selectedCurriculum={form.watch("targetCurriculum") as 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null}
            selectedLevel={form.watch("targetLevel") as 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null}
            selectedLanguage={form.watch("targetLanguage") as 'arabic' | 'languages' | null}
            selectedGrade={form.watch("targetGrade")}
            onCurriculumChange={(curriculum) => {
                form.setValue("targetCurriculum", curriculum || "");
                form.setValue("targetLevel", ""); // Reset level when curriculum changes
                form.setValue("targetLanguage", ""); // Reset language when curriculum changes
                form.setValue("targetGrade", ""); // Reset grade when curriculum changes
            }}
            onLevelChange={(level) => {
                form.setValue("targetLevel", level || "");
                form.setValue("targetLanguage", ""); // Reset language when level changes
                form.setValue("targetGrade", ""); // Reset grade when level changes
            }}
            onLanguageChange={(language) => {
                form.setValue("targetLanguage", language || "");
                form.setValue("targetGrade", ""); // Reset grade when language changes
            }}
            onGradeChange={(grade) => {
                form.setValue("targetGrade", grade || "");
            }}
        />
                        </div>
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={isLoading}
                                type="submit"
                            >
                                حفظ
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
} 
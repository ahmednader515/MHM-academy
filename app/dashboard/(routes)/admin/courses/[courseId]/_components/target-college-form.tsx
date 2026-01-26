"use client"

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Course } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/contexts/language-context";
import { CurriculumSelector } from "@/components/curriculum-selector";

interface TargetCollegeFormProps {
    initialData: Course;
    courseId: string;
    isAdmin?: boolean;
}

    const formSchema = z.object({
        targetCurriculum: z.string().optional(),
        targetCurriculumType: z.string().optional(),
        targetLevel: z.string().optional(),
        targetLanguage: z.string().optional(),
        targetGrade: z.string().optional(),
    });

export const TargetCollegeForm = ({
    initialData,
    courseId,
    isAdmin = false
}: TargetCollegeFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetCurriculum: initialData.targetCurriculum || "",
            targetCurriculumType: (initialData as any).targetCurriculumType || "",
            targetLevel: initialData.targetLevel || "",
            targetLanguage: initialData.targetLanguage || "",
            targetGrade: initialData.targetGrade || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t('teacher.targetCollegeUpdatedSuccessfully'));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-3 sm:p-4">
            <div className="font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className="text-sm sm:text-base">المنهج والمرحلة والصف المستهدفة</span>
                <Button onClick={toggleEdit} variant="ghost" size="sm" className="w-full sm:w-auto justify-start sm:justify-center">
                    {isEditing && (<>{t('common.cancel')}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">تعديل المنهج والمرحلة والصف</span>
                        <span className="sm:hidden">تعديل</span>
                    </>)}
                </Button>
            </div>
            {!isEditing && (
        <p className={cn(
            "text-sm mt-2 text-muted-foreground",
            !initialData.targetCurriculum && "text-muted-foreground italic"
        )}>
            {initialData.targetCurriculum ? 
                `${initialData.targetCurriculum === 'egyptian' ? 'المنهج المصري' : 
                  initialData.targetCurriculum === 'saudi' ? 'المنهج السعودي' :
                  initialData.targetCurriculum === 'summer_courses' ? 'الكورسات الصيفية' :
                  initialData.targetCurriculum === 'center_mhm_academy' ? 'Center MHM Academy' : 
                  initialData.targetCurriculum}${(initialData as any).targetCurriculumType ? ` - ${(initialData as any).targetCurriculumType === 'morning' ? 'صباحي' : (initialData as any).targetCurriculumType === 'evening' ? 'مسائي' : (initialData as any).targetCurriculumType}` : ''}${initialData.targetLevel ? ` - ${initialData.targetLevel}` : ''}${initialData.targetLanguage ? ` - ${initialData.targetLanguage === 'arabic' ? 'عربي' : 'لغات'}` : ''}${initialData.targetGrade ? ` - ${initialData.targetGrade}` : ''}` 
                : t('teacher.notSpecified')
            }
        </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <CurriculumSelector
                            selectedCurriculum={form.watch("targetCurriculum") as 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null}
                            selectedCurriculumType={form.watch("targetCurriculumType") as 'morning' | 'evening' | null}
                            selectedLevel={form.watch("targetLevel") as 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null}
                            selectedLanguage={form.watch("targetLanguage") as 'arabic' | 'languages' | null}
                            selectedGrade={form.watch("targetGrade")}
                            onCurriculumChange={(curriculum) => {
                                form.setValue("targetCurriculum", curriculum || "");
                                // Reset curriculum type if not egyptian
                                if (curriculum !== 'egyptian') {
                                    form.setValue("targetCurriculumType", "");
                                }
                                form.setValue("targetLevel", ""); // Reset level when curriculum changes
                                form.setValue("targetLanguage", ""); // Reset language when curriculum changes
                                form.setValue("targetGrade", ""); // Reset grade when curriculum changes
                            }}
                            onCurriculumTypeChange={(curriculumType) => {
                                form.setValue("targetCurriculumType", curriculumType || "");
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
                        <div className="flex items-center gap-x-2">
                            <Button
                                disabled={!isValid || isSubmitting}
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

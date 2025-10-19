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

// Dropdown options for course targeting
const levelOptions = [
    "السنة الأولى",
    "السنة الثانية",
    "السنة الثالثة",
    "السنة الرابعة",
    "السنة الخامسة",
    "السنة السادسة",
    "الماجستير",
    "الدكتوراه",
    "دبلوم",
    "جميع المستويات"
];

interface TargetLevelFormProps {
    initialData: Course;
    courseId: string;
}

const formSchema = z.object({
    targetLevel: z.string().optional(),
});

export const TargetLevelForm = ({
    initialData,
    courseId
}: TargetLevelFormProps) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const toggleEdit = () => setIsEditing((current) => !current);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetLevel: initialData.targetLevel || "",
        },
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t('teacher.targetLevelUpdatedSuccessfully'));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t('teacher.targetLevel')}
                <Button onClick={toggleEdit} variant="ghost">
                    {isEditing && (<>{t('common.cancel')}</>)}
                    {!isEditing && (
                    <>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('teacher.editLevel')}
                    </>)}
                </Button>
            </div>
            {!isEditing && (
                <p className={cn(
                    "text-sm mt-2 text-muted-foreground",
                    !initialData.targetLevel && "text-muted-foreground italic"
                )}>
                    {initialData.targetLevel || t('teacher.notSpecified')}
                </p>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField
                            control={form.control}
                            name="targetLevel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('teacher.selectTargetLevel')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {levelOptions.map((level) => (
                                                    <SelectItem key={level} value={level}>
                                                        {level}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
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

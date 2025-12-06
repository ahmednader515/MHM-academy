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
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";

interface PriceFormProps {
    initialData: Course;

    courseId: string;
    isAdmin?: boolean;
}

const formSchema = z.object({
    price: z.coerce.number()
});

export const PriceForm = ({
    initialData,
    courseId,
    isAdmin = false
}: PriceFormProps) => {
    const { t } = useLanguage();
    const { formatPrice } = useCurrency();
    const [isEditing, setIsEditing] = useState(false);

    const toggleEdit = () => setIsEditing((current) => !current);

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            price: initialData?.price ?? 0,
        }
    });

    const { isSubmitting, isValid } = form.formState;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await axios.patch(`/api/courses/${courseId}`, values);
            toast.success(t('teacher.courseUpdatedSuccessfully'));
            toggleEdit();
            router.refresh();
        } catch {
            toast.error(t('teacher.errorOccurred'));
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                {t('teacher.coursePrice')}
                {!initialData.isFree && (
                    <Button onClick={toggleEdit} variant="ghost">
                        {isEditing && (<>{t('common.cancel')}</>)}
                        {!isEditing && (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('teacher.editPrice')}
                        </>)}
                    </Button>
                )}
            </div>
            {!isEditing && (
                <div className="mt-2">
                    <p className={cn(
                        "text-sm text-muted-foreground",
                        !initialData.price && initialData.price !== 0 && "text-muted-foreground italic"
                    )}>
                        {initialData.isFree
                          ? t('teacher.free')
                          : initialData.price === 0
                          ? t('teacher.free')
                          : initialData.price
                          ? formatPrice(initialData.price)
                          : t('teacher.noPrice')
                        }
                    </p>
                    {initialData.isFree && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('teacher.priceDisabledForFreeCourse')}
                        </p>
                    )}
                </div>
            )}

            {isEditing && (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                        <FormField 
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            type="number"
                                            step="0.01"
                                            disabled={isSubmitting}
                                            placeholder={t('teacher.setCoursePrice')}
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                field.onChange(value === '' ? 0 : parseFloat(value));
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-x-2">
                            <Button disabled={!isValid || isSubmitting} type="submit">
                                {t('common.save')}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    )
}

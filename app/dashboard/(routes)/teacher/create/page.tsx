"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";
import { useLanguage } from "@/lib/contexts/language-context";

const CreatePage = () => {
    const { t } = useLanguage();
    const router = useRouter();

    const formSchema = z.object({
        title: z.string().min(1, {
            message: t('validation.required'),
        }),
        isFree: z.boolean().optional(),
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            isFree: false
        },
    })

    const { isSubmitting, isValid } = form.formState;

    const { getToken } = useAuth();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
          const token = await getToken();
      
          const response = await axios.post("/api/courses", values, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
      
          router.push(`/dashboard/teacher/courses/${response.data.id}`);
          toast.success(t('teacher.courseCreatedSuccessfully'));
        } catch {
          toast.error(t('teacher.courseCreationError'));
        }
      };

    return ( 
        <div className="max-w-5xl mx-auto flex md:items-center md:justify-center h-full p-6">
            <div>
                <h1 className="text-2xl">
                    {t('teacher.courseName')}
                </h1>
                <p className="text-sm text-slate-600">
                    {t('teacher.courseNameDescription')}
                </p>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8 mt-8"
                    >

                        <FormField

                            control={form.control}
                            name ="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {t('teacher.courseTitle')}
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isSubmitting}
                                            placeholder={t('teacher.courseTitlePlaceholder')}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        {t('teacher.courseTitleDescription')}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}

                        />

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
                            <Link href="/">
                                <Button
                                    variant="ghost"
                                    type="button"
                                >
                                    {t('common.cancel')}
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                            >
                                {t('common.continue')}
                            </Button>
                        </div>

                    </form>
                </Form>
            </div>
        </div>
     );
}
 
export default CreatePage;
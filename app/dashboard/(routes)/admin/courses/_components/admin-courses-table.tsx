"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";

type Course = {
  id: string;
  title: string;
  price: number;
  isPublished: boolean;
  createdAt: string | Date;
};

export function AdminCoursesTable({ courses, onDeleted }: { courses: Course[]; onDeleted?: () => void }) {
  const { t, isRTL } = useLanguage();
  const handleDelete = async (courseId: string) => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || t('dashboard.deleteCourseError'));
      }
      toast.success(t('dashboard.deleteCourseSuccess'));
      onDeleted?.();
    } catch (e: any) {
      toast.error(e?.message || t('dashboard.errorOccurred'));
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.title')}</TableHead>
            <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.price')}</TableHead>
            <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.status')}</TableHead>
            <TableHead className={isRTL ? "text-right" : "text-left"}>{t('dashboard.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell className={isRTL ? "text-right" : "text-left"}>{course.title}</TableCell>
              <TableCell className={isRTL ? "text-right" : "text-left"}>{Number(course.price || 0)}</TableCell>
              <TableCell className={isRTL ? "text-right" : "text-left"}>{course.isPublished ? t('dashboard.published') : t('dashboard.draft')}</TableCell>
              <TableCell className={isRTL ? "text-right" : "text-left"}>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/teacher/courses/${course.id}`}>
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}



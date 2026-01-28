"use client";

import { useState } from "react";
import { Calendar, Image as ImageIcon, X } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";

interface Timetable {
  id: string;
  imageUrl: string;
  targetCurriculum?: string | null;
  targetGrade?: string | null;
  targetSection?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  } | null;
}

interface TimetableViewContentProps {
  timetables: Timetable[];
  role: "teacher" | "student";
}

export const TimetableViewContent = ({ timetables, role }: TimetableViewContentProps) => {
  const { t } = useLanguage();
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {role === "teacher"
              ? t('teacher.myTimetable') || "My Timetable"
              : t('student.myTimetable') || "My Timetable"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {role === "teacher"
            ? t('teacher.viewYourSchedule') || "View your weekly schedule and class timings"
            : t('student.viewYourSchedule') || "View your timetable based on your curriculum, grade, and section"}
        </p>
      </div>

      {timetables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {role === "teacher"
                ? t('teacher.noTimetables') || "No timetables available for your courses yet."
                : t('student.noTimetables') || "No timetables available matching your profile yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetables.map((timetable) => (
            <Card 
              key={timetable.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
              onClick={() => setSelectedTimetable(timetable)}
            >
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="relative w-full aspect-[4/3] bg-muted">
                  <Image
                    src={timetable.imageUrl}
                    alt="Timetable"
                    fill
                    className="object-contain"
                  />
                </div>
                {timetable.course?.title && (
                  <div className="p-4 border-t">
                    <p className="text-sm font-semibold text-center">
                      {timetable.course.title}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTimetable} onOpenChange={(open) => !open && setSelectedTimetable(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-transparent border-none shadow-none grid-cols-1 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">
            {t('teacher.timetableZoom') || "Timetable - Zoomed View"}
          </DialogTitle>
          {selectedTimetable && (
            <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[90vh]">
              <button
                onClick={() => setSelectedTimetable(null)}
                className="absolute top-4 right-4 z-[100] bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="relative w-full flex-1 max-w-[90vw] max-h-[85vh] flex items-center justify-center mb-4">
                <Image
                  src={selectedTimetable.imageUrl}
                  alt="Timetable - Zoomed"
                  width={1920}
                  height={1080}
                  className="object-contain w-full h-full"
                  unoptimized
                />
              </div>
              {selectedTimetable.course?.title && (
                <div className="w-full max-w-[90vw] px-4 pb-4 text-center">
                  <p className="text-lg font-semibold text-white bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                    {selectedTimetable.course.title}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

"use client";

import { Calendar, Clock, BookOpen } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { TimetableCalendar } from "@/app/dashboard/_components/timetable-calendar";
import { Card, CardContent } from "@/components/ui/card";

interface Timetable {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  description?: string;
  course: {
    id: string;
    title: string;
    user: {
      id: string;
      fullName: string;
    };
  };
}

interface TimetableViewContentProps {
  timetables: Timetable[];
  role: "teacher" | "student";
}

export const TimetableViewContent = ({ timetables, role }: TimetableViewContentProps) => {
  const { t } = useLanguage();

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
            : t('student.viewYourSchedule') || "View your enrolled courses schedule"}
        </p>
      </div>

      {timetables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {role === "teacher"
                ? t('teacher.noTimetables') || "No timetables available for your courses yet."
                : t('student.noTimetables') || "No timetables available for your enrolled courses yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <TimetableCalendar timetables={timetables} />
      )}
    </div>
  );
};


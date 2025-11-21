"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { TimetableDialog } from "./timetable-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTimetableCalendar } from "./admin-timetable-calendar";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  targetCurriculum?: string | null;
  targetLevel?: string | null;
  targetLanguage?: string | null;
  targetGrade?: string | null;
  user: {
    id: string;
    fullName: string;
  };
}

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

interface TimetablesContentProps {
  courses: Course[];
  timetables: Timetable[];
}

export const TimetablesContent = ({ courses, timetables: initialTimetables }: TimetablesContentProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [timetables, setTimetables] = useState<Timetable[]>(initialTimetables);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);

  // Sync local state with props when they change (after router.refresh())
  useEffect(() => {
    setTimetables(initialTimetables);
  }, [initialTimetables]);

  const handleCreate = () => {
    setEditingTimetable(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (timetable: Timetable) => {
    setEditingTimetable(timetable);
    setIsDialogOpen(true);
  };

  const handleDelete = async (timetableId: string) => {
    try {
      await axios.delete(`/api/timetables/${timetableId}`);
      toast.success(t('common.success') || "Timetable deleted successfully");
      setTimetables(timetables.filter((t) => t.id !== timetableId));
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('common.error') || "Failed to delete timetable");
    }
  };

  const handleDialogClose = async () => {
    setIsDialogOpen(false);
    setEditingTimetable(null);
    
    // Fetch updated timetables to show the new/updated entry immediately
    try {
      const response = await axios.get("/api/timetables");
      setTimetables(response.data);
    } catch (error) {
      console.error("Failed to fetch updated timetables:", error);
    }
    
    // Also refresh the router to sync with server state
    router.refresh();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.timetables') || "Timetables"}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.manageTimetables') || "Create and manage course timetables"}
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-black hover:bg-black/90 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('admin.createTimetable') || "Create Timetable"}
        </Button>
      </div>

      {timetables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('admin.noTimetables') || "No timetables created yet. Create your first timetable to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <AdminTimetableCalendar
          timetables={timetables}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <TimetableDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        courses={courses}
        timetable={editingTimetable}
      />
    </div>
  );
};


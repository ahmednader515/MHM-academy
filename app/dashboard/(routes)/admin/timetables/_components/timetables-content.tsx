"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { TimetableDialog } from "./timetable-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { TimetablesGrid } from "./timetables-grid";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Timetable {
  id: string;
  imageUrl: string;
  targetCurriculum?: string | null;
  targetGrade?: string | null;
  targetSection?: string | null;
  courseId?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  } | null;
}

interface TimetablesContentProps {
  timetables: Timetable[];
}

export const TimetablesContent = ({ timetables: initialTimetables }: TimetablesContentProps) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [timetables, setTimetables] = useState<Timetable[]>(initialTimetables);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);
  const justUpdatedRef = useRef(false);

  // Sync local state with props when they change (after router.refresh())
  // But only if we haven't just updated via API to avoid overwriting fresh data
  useEffect(() => {
    if (!justUpdatedRef.current) {
      setTimetables(initialTimetables);
    } else {
      // Reset the flag after a short delay
      setTimeout(() => {
        justUpdatedRef.current = false;
      }, 1000);
    }
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

  const handleDialogClose = async (newTimetable?: any) => {
    setIsDialogOpen(false);
    setEditingTimetable(null);
    
    // Mark that we're updating via API to prevent useEffect from overwriting
    justUpdatedRef.current = true;
    
    // Always fetch updated timetables to ensure we have the latest data from server
    // This ensures consistency and includes any server-side processing
    try {
      const response = await axios.get("/api/timetables");
      if (response.data && Array.isArray(response.data)) {
        setTimetables(response.data);
        // Don't call router.refresh() here since we already have fresh data
        // It would cause unnecessary re-renders and potential race conditions
      } else {
        console.error("[TIMETABLES_CONTENT] Invalid response format:", response.data);
        // If fetch fails but we have newTimetable, add it optimistically
        if (newTimetable) {
          if (editingTimetable) {
            setTimetables(timetables.map(t => t.id === newTimetable.id ? newTimetable : t));
          } else {
            setTimetables([...timetables, newTimetable]);
          }
        }
        // Fallback: refresh the router to get updated data from server
        router.refresh();
      }
    } catch (error) {
      console.error("[TIMETABLES_CONTENT] Failed to fetch updated timetables:", error);
      // If fetch fails but we have newTimetable, add it optimistically
      if (newTimetable) {
        if (editingTimetable) {
          setTimetables(timetables.map(t => t.id === newTimetable.id ? newTimetable : t));
        } else {
          setTimetables([...timetables, newTimetable]);
        }
      }
      // Fallback: refresh the router to get updated data from server
      router.refresh();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.timetables') || "Timetables"}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.manageTimetables') || "Upload and manage timetable images"}
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-black hover:bg-black/90 text-white">
          <PlusCircle className="h-4 w-4 mr-2" />
          {t('admin.createTimetable') || "Create Timetable"}
        </Button>
      </div>

      {/* Always show calendar if we have timetables, or show empty state */}
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
        <TimetablesGrid
          timetables={timetables}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <TimetableDialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        timetable={editingTimetable}
      />
    </div>
  );
};


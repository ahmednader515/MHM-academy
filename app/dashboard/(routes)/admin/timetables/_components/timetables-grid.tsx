"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/contexts/language-context";
import { CURRICULA, getGradeById } from "@/lib/data/curriculum-data";

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

interface TimetablesGridProps {
  timetables: Timetable[];
  onEdit: (timetable: Timetable) => void;
  onDelete: (timetableId: string) => Promise<void>;
}

export const TimetablesGrid = ({
  timetables,
  onEdit,
  onDelete,
}: TimetablesGridProps) => {
  const { t } = useLanguage();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timetableToDelete, setTimetableToDelete] = useState<string | null>(null);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  const handleDeleteClick = (timetableId: string) => {
    setTimetableToDelete(timetableId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (timetableToDelete) {
      await onDelete(timetableToDelete);
      setDeleteDialogOpen(false);
      setTimetableToDelete(null);
    }
  };

  const getCurriculumName = (curriculumId: string | null | undefined) => {
    if (!curriculumId) return "-";
    const curriculum = CURRICULA.find(c => c.id === curriculumId);
    return curriculum?.name || curriculumId;
  };

  const getGradeName = (gradeId: string | null | undefined) => {
    if (!gradeId) return "-";
    // Handle comma-separated grades
    const gradeIds = gradeId.split(',').map(g => g.trim()).filter(Boolean);
    const gradeNames = gradeIds.map(id => {
      const grade = getGradeById(id);
      return grade?.name || id;
    });
    return gradeNames.join('، ') || "-";
  };

  const getSectionName = (section: string | null | undefined) => {
    if (!section) return "-";
    if (section === 'arabic') return 'عربي';
    if (section === 'languages') return 'لغات';
    // Handle comma-separated sections
    const sections = section.split(',').map(s => s.trim()).filter(Boolean);
    return sections.map(s => s === 'arabic' ? 'عربي' : s === 'languages' ? 'لغات' : s).join('، ') || "-";
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timetables.map((timetable) => (
          <Card key={timetable.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div 
                className="relative w-full aspect-[4/3] bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedTimetable(timetable)}
              >
                <Image
                  src={timetable.imageUrl}
                  alt="Timetable"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="p-4 space-y-2">
                {timetable.course?.title && (
                  <div className="pb-2 border-b">
                    <p className="text-sm font-semibold text-center">
                      {timetable.course.title}
                    </p>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('admin.curriculum') || "Curriculum"}:
                    </span>
                    <span className="font-medium">
                      {getCurriculumName(timetable.targetCurriculum)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('admin.grade') || "Grade"}:
                    </span>
                    <span className="font-medium">
                      {getGradeName(timetable.targetGrade)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t('admin.section') || "Section"} (القسم):
                    </span>
                    <span className="font-medium">
                      {getSectionName(timetable.targetSection)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit(timetable)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDeleteClick(timetable.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('admin.deleteTimetable') || "Delete Timetable"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.deleteTimetableConfirm') || "This action cannot be undone. This will permanently delete the timetable."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedTimetable} onOpenChange={(open) => !open && setSelectedTimetable(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-transparent border-none shadow-none grid-cols-1 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">
            {t('admin.timetableZoom') || "Timetable - Zoomed View"}
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
    </>
  );
};


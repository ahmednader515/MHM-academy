"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/contexts/language-context";
import { CurriculumSelector } from "@/components/curriculum-selector";
import { FileUpload } from "@/components/file-upload";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface Timetable {
  id: string;
  imageUrl: string;
  targetCurriculum?: string | null;
  targetCurriculumType?: string | null;
  targetGrade?: string | null;
  targetSection?: string | null;
  courseId?: string | null;
}

interface Course {
  id: string;
  title: string;
}

interface TimetableDialogProps {
  open: boolean;
  onClose: (newTimetable?: any) => void;
  timetable?: Timetable | null;
}

export const TimetableDialog = ({
  open,
  onClose,
  timetable,
}: TimetableDialogProps) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [selectedCurriculum, setSelectedCurriculum] = useState<'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null>(null);
  const [selectedCurriculumType, setSelectedCurriculumType] = useState<'morning' | 'evening' | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Fetch courses when dialog opens
  useEffect(() => {
    if (open) {
      const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
          const response = await axios.get("/api/admin/courses/all");
          if (response.data && Array.isArray(response.data)) {
            setCourses(response.data);
          }
        } catch (error) {
          console.error("Error fetching courses:", error);
          toast.error(t('admin.errorOccurred') || "Error loading courses");
        } finally {
          setLoadingCourses(false);
        }
      };
      fetchCourses();
    }
  }, [open, t]);

  // Reset form when dialog opens/closes or timetable changes
  useEffect(() => {
    if (!open) {
      setImageUrl("");
      setSelectedCurriculum(null);
      setSelectedCurriculumType(null);
      setSelectedLevel(null);
      setSelectedLanguage(null);
      setSelectedGrade(null);
      setSelectedCourseId(null);
    } else if (timetable) {
      setImageUrl(timetable.imageUrl || "");
      setSelectedCurriculum(timetable.targetCurriculum as any || null);
      setSelectedCurriculumType(timetable.targetCurriculumType as any || null);
      
      // Set language from targetSection (this is the stored value)
      setSelectedLanguage(timetable.targetSection || null);
      
      // Derive level from grade if grade exists
      if (timetable.targetGrade) {
        setSelectedGrade(timetable.targetGrade);
        // Try to get level from the first grade if comma-separated
        const firstGradeId = timetable.targetGrade.split(',')[0]?.trim();
        if (firstGradeId) {
          const { getGradeById } = require("@/lib/data/curriculum-data");
          const grade = getGradeById(firstGradeId);
          if (grade) {
            setSelectedLevel(grade.level);
            // Only set language from grade if targetSection is not set
            if (!timetable.targetSection && grade.language) {
              setSelectedLanguage(grade.language);
            }
          }
        }
      } else {
        setSelectedGrade(null);
        setSelectedLevel(null);
      }
      
      setSelectedCourseId(timetable.courseId || null);
    }
  }, [open, timetable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl) {
      toast.error(t('admin.imageRequired') || "Please upload a timetable image");
      return;
    }

    if (!selectedCurriculum) {
      toast.error(t('admin.curriculumRequired') || "Please select a curriculum");
      return;
    }

    if (!selectedGrade) {
      toast.error(t('admin.gradeRequired') || "Please select a grade");
      return;
    }

    if (!selectedCourseId) {
      toast.error(t('admin.courseRequired') || "Please select a course");
      return;
    }

    setIsLoading(true);

    try {
      const formData = {
        imageUrl,
        targetCurriculum: selectedCurriculum,
        targetCurriculumType: selectedCurriculumType, // نوع المنهج (morning/evening)
        targetGrade: selectedGrade,
        targetSection: selectedLanguage, // القسم is the language (عربي/لغات)
        courseId: selectedCourseId,
      };

      let response;
      if (timetable) {
        // Update existing timetable
        response = await axios.patch(`/api/timetables/${timetable.id}`, formData);
        toast.success(t('common.success') || "Timetable updated successfully");
      } else {
        // Create new timetable
        response = await axios.post("/api/timetables", formData);
        toast.success(t('common.success') || "Timetable created successfully");
      }
      // Pass the created/updated timetable to onClose
      onClose(response.data);
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        t('common.error') ||
        "An error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {timetable
              ? t('admin.editTimetable') || "Edit Timetable"
              : t('admin.createTimetable') || "Create Timetable"}
          </DialogTitle>
          <DialogDescription>
            {timetable
              ? t('admin.editTimetableDescription') || "Update the timetable details"
              : t('admin.createTimetableDescription') || "Upload a timetable image and specify the target curriculum, grade, and section"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="image">
              {t('admin.timetableImage') || "Timetable Image"} *
            </Label>
            {imageUrl ? (
              <div className="relative w-full h-64 border rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt="Timetable"
                  fill
                  className="object-contain"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setImageUrl("")}
                >
                  {t('common.remove') || "Remove"}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <FileUpload
                  endpoint="timetableImage"
                  onChange={(res) => {
                    if (res?.url) {
                      setImageUrl(res.url);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course">
              {t('admin.course') || "Course"} *
            </Label>
            <Select
              value={selectedCourseId || undefined}
              onValueChange={(value) => setSelectedCourseId(value)}
              disabled={loadingCourses}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCourses ? (t('dashboard.loading') || "Loading...") : (t('admin.selectCourse') || "Select a course")} />
              </SelectTrigger>
              <SelectContent 
                position="popper"
                side="bottom"
                sideOffset={4}
                className="max-h-[300px] overflow-y-auto"
              >
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('admin.timetableCourseHelp') || "Select a course to assign this timetable to."}
            </p>
          </div>

          {/* Curriculum, Grade, Section Selection */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-semibold">
              {t('admin.targetSelection') || "Target Selection"}
            </h3>
            <CurriculumSelector
              selectedCurriculum={selectedCurriculum}
              selectedCurriculumType={selectedCurriculumType}
              selectedLevel={selectedLevel}
              selectedLanguage={selectedLanguage}
              selectedGrade={selectedGrade}
              onCurriculumChange={setSelectedCurriculum}
              onCurriculumTypeChange={setSelectedCurriculumType}
              onLevelChange={setSelectedLevel}
              onLanguageChange={setSelectedLanguage}
              onGradeChange={setSelectedGrade}
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.timetableTargetHelp') || "Select the curriculum, grade, and section (language) for this timetable. Students matching these criteria will see this timetable."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {timetable ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

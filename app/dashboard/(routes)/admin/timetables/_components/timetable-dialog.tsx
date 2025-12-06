"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/lib/contexts/language-context";
import { CURRICULA, getLevelsByCurriculum, getGradesByLevel } from "@/lib/data/curriculum-data";
import axios from "axios";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface TimetableDialogProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  timetable?: Timetable | null;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const TimetableDialog = ({
  open,
  onClose,
  courses,
  timetable,
}: TimetableDialogProps) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [courseSelectOpen, setCourseSelectOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  
  // Filter states
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    courseId: "",
    dayOfWeek: 1,
    startTime: "",
    endTime: "",
    title: "",
    description: "",
  });

  // Get available levels, languages, and grades based on curriculum selection
  const availableLevels = useMemo(() => {
    if (!selectedCurriculum || selectedCurriculum === "all") return [];
    return getLevelsByCurriculum(selectedCurriculum as any);
  }, [selectedCurriculum]);

  const availableGrades = useMemo(() => {
    if (!selectedCurriculum || selectedCurriculum === "all" || !selectedLevel || selectedLevel === "all") return [];
    return getGradesByLevel(selectedCurriculum as any, selectedLevel as any);
  }, [selectedCurriculum, selectedLevel]);

  // Filter courses based on selected curriculum, level, language, and grade
  const filteredCourses = useMemo(() => {
    let filtered = courses;

    // Filter by curriculum
    if (selectedCurriculum && selectedCurriculum !== "all") {
      filtered = filtered.filter(
        (course) => !course.targetCurriculum || course.targetCurriculum === selectedCurriculum
      );
    }

    // Filter by level
    if (selectedLevel && selectedLevel !== "all") {
      filtered = filtered.filter(
        (course) => !course.targetLevel || course.targetLevel === selectedLevel
      );
    }

    // Filter by grade
    if (selectedGrade && selectedGrade !== "all") {
      filtered = filtered.filter(
        (course) => !course.targetGrade || course.targetGrade === selectedGrade
      );
    }

    // Filter by search term (course title or teacher name)
    if (courseSearch) {
      const searchLower = courseSearch.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchLower) ||
          course.user.fullName.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [courses, selectedCurriculum, selectedLevel, selectedGrade, courseSearch]);

  // Reset filters when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedCurriculum("all");
      setSelectedLevel("all");
      setSelectedGrade("all");
      setCourseSearch("");
      setCourseSelectOpen(false);
    } else if (timetable) {
      // When editing, find the course and set filters based on its properties
      const course = courses.find((c) => c.id === timetable.courseId);
      if (course) {
        setSelectedCurriculum(course.targetCurriculum || "all");
        setSelectedLevel(course.targetLevel || "all");
        setSelectedGrade(course.targetGrade || "all");
      }
    }
  }, [open, timetable, courses]);

  useEffect(() => {
    if (timetable) {
      setFormData({
        courseId: timetable.courseId,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        title: timetable.title,
        description: timetable.description || "",
      });
    } else {
      setFormData({
        courseId: "",
        dayOfWeek: 1,
        startTime: "",
        endTime: "",
        title: "",
        description: "",
      });
    }
  }, [timetable, open]);

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    if (!selectedCurriculum || selectedCurriculum === "all") {
      setSelectedLevel("all");
      setSelectedGrade("all");
    }
  }, [selectedCurriculum]);

  useEffect(() => {
    if (!selectedLevel || selectedLevel === "all") {
      setSelectedGrade("all");
    }
  }, [selectedLevel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (timetable) {
        // Update existing timetable
        await axios.patch(`/api/timetables/${timetable.id}`, formData);
        toast.success(t('common.success') || "Timetable updated successfully");
      } else {
        // Create new timetable
        await axios.post("/api/timetables", formData);
        toast.success(t('common.success') || "Timetable created successfully");
      }
      onClose();
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

  const selectedCourse = courses.find((c) => c.id === formData.courseId);

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
              : t('admin.createTimetableDescription') || "Fill in the details to create a new timetable entry"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Filter Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-semibold">{t('admin.filterCourses') || "Filter Courses"}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="curriculum">
                  {t('admin.curriculum') || "Curriculum"}
                </Label>
                <Select
                  value={selectedCurriculum}
                  onValueChange={setSelectedCurriculum}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectCurriculum') || "All Curricula"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.all') || "All"}</SelectItem>
                    {CURRICULA.map((curriculum) => (
                      <SelectItem key={curriculum.id} value={curriculum.id}>
                        {curriculum.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">
                  {t('admin.level') || "Level"}
                </Label>
                <Select
                  value={selectedLevel}
                  onValueChange={setSelectedLevel}
                  disabled={!selectedCurriculum || selectedCurriculum === "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectLevel') || "All Levels"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.all') || "All"}</SelectItem>
                    {availableLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">
                  {t('admin.grade') || "Grade"}
                </Label>
                <Select
                  value={selectedGrade}
                  onValueChange={setSelectedGrade}
                  disabled={!selectedLevel || selectedLevel === "all" || availableGrades.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.selectGrade') || "All Grades"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('admin.all') || "All"}</SelectItem>
                    {availableGrades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Course Selection with Search */}
          <div className="space-y-2">
            <Label htmlFor="courseId">
              {t('admin.course') || "Course"} *
            </Label>
            <Popover open={courseSelectOpen} onOpenChange={setCourseSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={courseSelectOpen}
                  className="w-full justify-between"
                >
                  {selectedCourse
                    ? `${selectedCourse.title} (${selectedCourse.user.fullName})`
                    : t('admin.selectCourse') || "Select a course..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder={t('admin.searchCourseOrTeacher') || "Search course or teacher..."}
                    value={courseSearch}
                    onValueChange={setCourseSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t('admin.noCoursesFound') || "No courses found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredCourses.map((course) => (
                        <CommandItem
                          key={course.id}
                          value={`${course.title} ${course.user.fullName}`}
                          onSelect={() => {
                            setFormData({ ...formData, courseId: course.id });
                            setCourseSelectOpen(false);
                            setCourseSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.courseId === course.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{course.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {course.user.fullName}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">
                {t('admin.dayOfWeek') || "Day of Week"} *
              </Label>
              <Select
                value={formData.dayOfWeek.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, dayOfWeek: parseInt(value) })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {t('admin.title') || "Title"} *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder={t('admin.enterTitle') || "e.g., Mathematics Class"}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">
                {t('admin.startTime') || "Start Time"} *
              </Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">
                {t('admin.endTime') || "End Time"} *
              </Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t('admin.description') || "Description"}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t('admin.enterDescription') || "Optional description"}
              rows={3}
            />
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

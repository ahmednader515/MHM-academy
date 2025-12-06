"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

interface AdminTimetableCalendarProps {
  timetables: Timetable[];
  onEdit: (timetable: Timetable) => void;
  onDelete: (timetableId: string) => Promise<void>;
}

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_SHORT_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Generate time slots for all 24 hours (hourly intervals)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Convert time string to minutes for comparison
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const AdminTimetableCalendar = ({ timetables, onEdit, onDelete }: AdminTimetableCalendarProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get translated day names
  const DAYS = DAY_KEYS.map(key => t(`dashboard.${key}`) || key);
  const DAYS_SHORT = DAY_SHORT_KEYS.map(key => t(`dashboard.${key}`) || key);

  // Convert 24-hour format to 12-hour format with translations
  const formatTo12Hour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? t('dashboard.pm') || 'PM' : t('dashboard.am') || 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Group timetables by day
  const timetablesByDay = timetables.reduce((acc, timetable) => {
    if (!acc[timetable.dayOfWeek]) {
      acc[timetable.dayOfWeek] = [];
    }
    acc[timetable.dayOfWeek].push(timetable);
    return acc;
  }, {} as Record<number, Timetable[]>);


  // Get all unique time ranges to determine which rows to show
  const allTimeRanges = timetables.map(t => ({
    start: timeToMinutes(t.startTime),
    end: timeToMinutes(t.endTime),
  }));

  // Calculate min and max times - always include ALL timetables
  const minTime = allTimeRanges.length > 0 
    ? Math.min(...allTimeRanges.map(t => t.start))
    : timeToMinutes('06:00'); // Default to earliest possible start
  const maxTime = allTimeRanges.length > 0
    ? Math.max(...allTimeRanges.map(t => t.end))
    : timeToMinutes('22:00'); // Default to latest possible end

  // Ensure the range covers at least the default 06:00-22:00
  // If we have timetables, make sure we include them all with a buffer
  const effectiveMinTime = allTimeRanges.length > 0 
    ? Math.min(minTime - 90, timeToMinutes('06:00')) // Buffer before earliest timetable
    : timeToMinutes('06:00');
  const effectiveMaxTime = allTimeRanges.length > 0
    ? Math.max(maxTime + 90, timeToMinutes('22:00')) // Buffer after latest timetable
    : timeToMinutes('22:00');

  // Filter time slots based on expansion state
  // Default: Show 12:00 PM (12:00) to 11:00 PM (23:00)
  // Expanded: Show all 24 hours (00:00 to 23:00)
  const relevantTimeSlots = isExpanded
    ? TIME_SLOTS // Show all 24 hours when expanded
    : TIME_SLOTS.filter(slot => {
        const slotMinutes = timeToMinutes(slot);
        // Show 12:00 PM (12:00) to 11:00 PM (23:00) by default
        return slotMinutes >= timeToMinutes('12:00') && slotMinutes <= timeToMinutes('23:00');
      });


  // Get the time slot that contains a given time (rounds down to nearest hour)
  const getSlotForTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    // Round down to nearest hour (just use the hour, ignore minutes)
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  // Get timetable for a specific day and time slot
  const getTimetableAtSlot = (dayIndex: number, timeSlot: string): Timetable | null => {
    const dayTimetables = timetablesByDay[dayIndex] || [];
    
    const result = dayTimetables.find(t => {
      // Get the slot that should contain this timetable's start time
      const timetableSlot = getSlotForTime(t.startTime);
      // Check if this is the slot that contains the timetable start
      return timeSlot === timetableSlot;
    }) || null;
    return result;
  };

  // Check if a timetable spans multiple rows
  const getTimetableRowSpan = (timetable: Timetable): number => {
    const duration = timeToMinutes(timetable.endTime) - timeToMinutes(timetable.startTime);
    // Each row is 1 hour (60 minutes), so calculate how many rows this spans (minimum 1)
    return Math.max(1, Math.ceil(duration / 60));
  };
  
  // Check if a time slot is inside a timetable (but not the start)
  const isTimeSlotInsideTimetable = (dayIndex: number, timeSlot: string): boolean => {
    const dayTimetables = timetablesByDay[dayIndex] || [];
    const slotMinutes = timeToMinutes(timeSlot);
    
    return dayTimetables.some(t => {
      const startMinutes = timeToMinutes(t.startTime);
      const endMinutes = timeToMinutes(t.endTime);
      // Inside the range but not at the start slot
      // Use the slot that contains the start time for comparison
      const startSlot = getSlotForTime(t.startTime);
      const startSlotMinutes = timeToMinutes(startSlot);
      return slotMinutes > startSlotMinutes && slotMinutes < endMinutes;
    });
  };

  const handleDelete = async (timetableId: string) => {
    try {
      await onDelete(timetableId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Card className="overflow-hidden border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '120px' }} />
            {DAYS.map((_, index) => (
              <col key={index} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b h-14">
              <th className="sticky left-0 z-10 bg-background border-r px-3 py-4 text-center text-sm sm:text-base font-semibold">
                {t('dashboard.time') || 'Time'}
              </th>
              {DAYS.map((day, index) => (
                <th
                  key={index}
                  className="border-r last:border-r-0 px-3 py-4 text-center text-sm sm:text-base font-semibold"
                >
                  <div className="flex flex-col">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{DAYS_SHORT[index]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relevantTimeSlots.map((timeSlot) => {
              // All slots are now hourly, so always show as hour
              const displayTime = formatTo12Hour(timeSlot);
              
              return (
                <tr key={timeSlot} className="border-b hover:bg-accent/30 transition-colors h-14">
                  <td className="sticky left-0 z-10 bg-background border-r px-3 py-2 text-sm text-muted-foreground text-center align-middle">
                    <span className="whitespace-nowrap font-semibold">
                      {displayTime}
                    </span>
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const timetable = getTimetableAtSlot(dayIndex, timeSlot);
                    
                    // Check if this is the start of a timetable entry
                    // Note: getTimetableAtSlot already checks for exact match, so this should always be true if timetable exists
                    const isTimetableStart = timetable !== null;
                    
                    if (isTimetableStart && timetable) {
                      const rowSpan = getTimetableRowSpan(timetable);
                      return (
                        <td
                          key={dayIndex}
                          rowSpan={rowSpan}
                          className="border-r last:border-r-0 p-1.5 align-top"
                        >
                          <div className="bg-primary/10 hover:bg-primary/20 rounded-lg p-3 h-full transition-colors border border-primary/20 flex flex-col group relative">
                            <div className="flex items-start justify-between mb-1.5">
                              <h4 className="font-semibold text-sm leading-tight line-clamp-1 flex-1 pr-2">
                                {timetable.title}
                              </h4>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => onEdit(timetable)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('common.confirm') || "Are you sure?"}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('admin.deleteTimetableConfirm') || "This action cannot be undone. This will permanently delete the timetable."}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(timetable.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {t('common.delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 mb-1.5 w-fit h-5">
                              {timetable.course.title}
                            </Badge>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {formatTo12Hour(timetable.startTime)} - {formatTo12Hour(timetable.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate text-xs">{timetable.course.user.fullName}</span>
                              </div>
                            </div>
                            {timetable.description && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {timetable.description}
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    }
                    
                    // If this cell is part of a timetable that spans multiple rows, skip it
                    if (isTimeSlotInsideTimetable(dayIndex, timeSlot)) {
                      return null;
                    }
                    
                    // Empty cell
                    return (
                      <td key={dayIndex} className="border-r last:border-r-0 p-1.5">
                        {/* Empty cell */}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {timetables.length === 0 && (
        <div className="p-12 text-center text-muted-foreground">
          <p>{t('dashboard.noClassesScheduled') || 'No classes scheduled'}</p>
        </div>
      )}
      {/* Expand/Collapse Button */}
      <div className="border-t p-4 flex justify-center">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {t('admin.collapseTimetable') || 'Show 12 PM - 12 AM Only'}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {t('admin.expandTimetable') || 'Show Full Day (12 AM - 12 PM)'}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};


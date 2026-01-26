"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Chapter, Quiz } from "@prisma/client";
import { Grip, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

interface CourseItem {
    id: string;
    title: string;
    position: number;
    isPublished: boolean;
    type: "chapter" | "quiz";
    isFree?: boolean; // Only for chapters
}

interface CourseContentListProps {
    items: CourseItem[];
    onReorder: (updateData: { id: string; position: number; type: "chapter" | "quiz" }[]) => void;
    onEdit: (id: string, type: "chapter" | "quiz") => void;
    onDelete: (id: string, type: "chapter" | "quiz") => void;
}

export const CourseContentList = ({
    items,
    onReorder,
    onEdit,
    onDelete
}: CourseContentListProps) => {
    const { t } = useLanguage();
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const reorderedItems = Array.from(items);
        const [movedItem] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, movedItem);

        const updateData = reorderedItems.map((item, index) => ({
            id: item.id,
            position: index + 1,
            type: item.type,
        }));

        onReorder(updateData);
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="course-content">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                        {items.map((item, index) => (
                            <Draggable 
                                key={item.id} 
                                draggableId={item.id} 
                                index={index}
                            >
                                {(provided) => (
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 bg-muted border border-muted text-muted-foreground rounded-md mb-3 text-sm overflow-hidden",
                                            item.isPublished && "bg-primary/20 border-primary/20"
                                        )}
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                    >
                                        <div
                                            className={cn(
                                                "px-2 sm:px-3 py-2 sm:py-3 border-r border-muted hover:bg-muted/50 transition flex items-center justify-center flex-shrink-0",
                                                item.isPublished && "border-r-primary/20"
                                            )}
                                            {...provided.dragHandleProps}
                                        >
                                            <Grip className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 px-2 sm:px-3 py-2 sm:py-3 min-w-0 flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-foreground break-words">{item.title}</span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                                    {item.type === "chapter" ? t('teacher.chapter') : t('teacher.quiz')}
                                                </Badge>
                                                <Badge
                                                    className={cn(
                                                        "bg-muted text-muted-foreground text-xs whitespace-nowrap",
                                                        item.isPublished && "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    {item.isPublished ? t('teacher.published') : t('teacher.draft')}
                                                </Badge>
                                                {item.type === "chapter" && item.isFree && (
                                                    <Badge className="text-xs whitespace-nowrap">
                                                        {t('teacher.free')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="px-2 sm:px-3 py-2 sm:py-3 border-l border-muted flex items-center gap-1.5 sm:gap-x-2 flex-shrink-0">
                                            {item.isPublished ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onEdit(item.id, item.type)}
                                                    className="hover:opacity-75 transition text-xs sm:text-sm h-8"
                                                >
                                                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">{t('common.edit')}</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onEdit(item.id, item.type)}
                                                    className="hover:opacity-75 transition text-xs sm:text-sm h-8"
                                                >
                                                    <span className="hidden sm:inline">
                                                        {item.type === "chapter" ? t('teacher.addVideo') : t('teacher.addQuestions')}
                                                    </span>
                                                    <span className="sm:hidden text-xs">
                                                        {item.type === "chapter" ? t('teacher.addVideo') : t('teacher.addQuestions')}
                                                    </span>
                                                </Button>
                                            )}
                                            <Trash2
                                                onClick={() => onDelete(item.id, item.type)}
                                                className="w-4 h-4 cursor-pointer hover:opacity-75 transition flex-shrink-0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}; 
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";

export type Course = {
    id: string;
    title: string;
    price: number;
    isPublished: boolean;
    createdAt: Date;
    enrolledStudentsCount: number;
    user?: {
        id: string;
        fullName: string;
        role: string;
    };
}

export const useColumns = (isAdmin: boolean = false): ColumnDef<Course>[] => {
    const { t } = useLanguage();
    
    const columns: ColumnDef<Course>[] = [
        {
            accessorKey: "title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.courseTitle')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        // Add teacher name column for admin view
        ...(isAdmin ? [{
            accessorKey: "user",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('admin.teacherName')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const user = row.getValue("user") as { fullName: string; role: string } | undefined;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{user?.fullName || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user?.role || 'Unknown'}</span>
                    </div>
                );
            },
        }] : []),
        {
            accessorKey: "price",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.price')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const price = parseFloat(row.getValue("price"));
                return <div>{price} EGP</div>;
            },
        },
        {
            accessorKey: "enrolledStudentsCount",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.enrolledStudents')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const count = row.getValue("enrolledStudentsCount") as number;
                return (
                    <div className="text-center font-medium">
                        {count}
                    </div>
                );
            },
        },
        {
            accessorKey: "isPublished",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.status')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const isPublished = row.getValue("isPublished") || false;
                return (
                    <Badge variant={isPublished ? "default" : "secondary"}>
                        {isPublished ? t('teacher.published') : t('teacher.draft')}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t('teacher.createdAt')}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const date = new Date(row.getValue("createdAt"));
                return <div>{format(date, "dd/MM/yyyy", { locale: ar })}</div>;
            },
        }
    ];

    return columns;
}; 
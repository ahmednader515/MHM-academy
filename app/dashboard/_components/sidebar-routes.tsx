"use client";

import { BarChart, Compass, Layout, List, Wallet, Shield, Users, Eye, TrendingUp, BookOpen, FileText, Award, PlusSquare } from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

export const SidebarRoutes = ({ closeOnClick = false }: { closeOnClick?: boolean }) => {
    const pathname = usePathname();
    const { t } = useLanguage();

    const guestRoutes = [
        {
            icon: Layout,
            label: t('dashboard.overview'),
            href: "/dashboard",
        },
        {
            icon: Compass,
            label: t('dashboard.courses'),
            href: "/dashboard/search",
        },
        {
            icon: Wallet,
            label: t('dashboard.balance'),
            href: "/dashboard/balance",
        },
    ];

    const teacherRoutes = [
        {
            icon: List,
            label: t('dashboard.courses'),
            href: "/dashboard/teacher/courses",
        },
        {
            icon: FileText,
            label: t('dashboard.quizzes'),
            href: "/dashboard/teacher/quizzes",
        },
        {
            icon: Award,
            label: t('dashboard.grades'),
            href: "/dashboard/teacher/grades",
        },
        {
            icon: BarChart,
            label: t('dashboard.analytics'),
            href: "/dashboard/teacher/analytics",
        },
        {
            icon: Users,
            label: t('dashboard.students'),
            href: "/dashboard/teacher/users",
        },
        {
            icon: Shield,
            label: t('teacher.createAccount'),
            href: "/dashboard/teacher/create-account",
        },
    ];

    const adminRoutes = [
        {
            icon: Users,
            label: t('admin.userManagement'),
            href: "/dashboard/admin/users",
        },
        {
            icon: List,
            label: t('dashboard.courses'),
            href: "/dashboard/admin/courses",
        },
        {
            icon: FileText,
            label: t('dashboard.quizzes'),
            href: "/dashboard/admin/quizzes",
        },
        {
            icon: Shield,
            label: t('admin.createAccount'),
            href: "/dashboard/admin/create-account",
        },
        {
            icon: Eye,
            label: t('admin.passwords'),
            href: "/dashboard/admin/passwords",
        },
        {
            icon: Wallet,
            label: t('admin.balanceManagement'),
            href: "/dashboard/admin/balances",
        },
        {
            icon: TrendingUp,
            label: t('admin.studentProgress'),
            href: "/dashboard/admin/progress",
        },
        {
            icon: BookOpen,
            label: t('admin.addRemoveCourses'),
            href: "/dashboard/admin/add-courses",
        },
    ];

    const pathName = usePathname();

    const isTeacherPage = pathName?.includes("/dashboard/teacher");
    const isAdminPage = pathName?.includes("/dashboard/admin");
    const routes = isAdminPage ? adminRoutes : isTeacherPage ? teacherRoutes : guestRoutes;

    return (
        <div className="flex flex-col w-full pt-0">
            {routes.map((route) => (
                <SidebarItem
                  key={route.href}
                  icon={route.icon}
                  label={route.label}
                  href={route.href}
                  closeOnClick={closeOnClick}
                />
            ))}
        </div>
    );
}
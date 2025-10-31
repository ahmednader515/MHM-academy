"use client";

import { BarChart, Compass, Layout, List, Wallet, Shield, Users, Eye, TrendingUp, BookOpen, FileText, Award, PlusSquare, Video, GraduationCap } from "lucide-react";
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
        {
            icon: Award,
            label: t('certificates.myCertificates') || 'My Certificates',
            href: "/dashboard/certificates",
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
            icon: Video,
            label: t('admin.liveStreams'),
            href: "/dashboard/teacher/livestreams",
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
            icon: Wallet,
            label: t('dashboard.balance'),
            href: "/dashboard/teacher/balance",
        },
        {
            icon: Eye,
            label: t('dashboard.studentProgress') || 'Student Progress',
            href: "/dashboard/teacher/progress",
        },
        {
            icon: Award,
            label: t('certificates.certificates') || 'Certificates',
            href: "/dashboard/teacher/certificates",
        },
        {
            icon: Shield,
            label: t('teacher.createAccount'),
            href: "/dashboard/teacher/create-account",
        },
    ];

    const parentRoutes = [
        {
            icon: Layout,
            label: t('parent.dashboard'),
            href: "/dashboard/parent",
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
            icon: Video,
            label: t('admin.liveStreams'),
            href: "/dashboard/admin/livestreams",
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
        {
            icon: GraduationCap,
            label: t('admin.teachersManagement') || 'Teachers',
            href: "/dashboard/admin/teachers",
        },
        {
            icon: Award,
            label: t('certificates.certificates') || 'Certificates',
            href: "/dashboard/admin/certificates",
        },
    ];

    const pathName = usePathname();

    const isTeacherPage = pathName?.includes("/dashboard/teacher");
    const isAdminPage = pathName?.includes("/dashboard/admin");
    const isParentPage = pathName?.includes("/dashboard/parent");
    const routes = isAdminPage ? adminRoutes : isTeacherPage ? teacherRoutes : isParentPage ? parentRoutes : guestRoutes;

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
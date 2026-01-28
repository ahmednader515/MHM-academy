"use client";

import { BarChart, Compass, Layout, List, Wallet, Shield, Users, Eye, TrendingUp, BookOpen, FileText, Award, PlusSquare, Video, GraduationCap, Calendar, Ticket, UserCheck, MessageSquare } from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";
import { useSession } from "next-auth/react";

export const SidebarRoutes = ({ closeOnClick = false }: { closeOnClick?: boolean }) => {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { data: session } = useSession();
    const role = session?.user?.role;

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
            icon: Calendar,
            label: t('dashboard.timetable') || 'Timetable',
            href: "/dashboard/timetables",
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
        {
            icon: Ticket,
            label: t('subscriptions.mySubscription') || 'My Subscription',
            href: "/dashboard/subscriptions",
        },
    ];

    const teacherRoutes = [
        {
            icon: List,
            label: t('dashboard.courses'),
            href: "/dashboard/teacher/courses",
        },
        {
            icon: Calendar,
            label: t('dashboard.timetable') || 'Timetable',
            href: "/dashboard/teacher/timetables",
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
            icon: Eye,
            label: t('dashboard.studentProgress') || 'Student Progress',
            href: "/dashboard/teacher/progress",
        },
        {
            icon: Award,
            label: t('certificates.certificates') || 'Certificates',
            href: "/dashboard/teacher/certificates",
        },
    ];

    const parentRoutes = [
        {
            icon: Layout,
            label: t('parent.dashboard'),
            href: "/dashboard/parent",
        },
        {
            icon: Award,
            label: t('certificates.certificates') || 'Certificates',
            href: "/dashboard/parent/certificates",
        },
    ];

    const adminRoutes = [
        {
            icon: UserCheck,
            label: t('admin.staffAndTeachers'),
            href: "/dashboard/admin/staff",
        },
        {
            icon: GraduationCap,
            label: t('admin.studentsManagement'),
            href: "/dashboard/admin/students",
        },
        {
            icon: List,
            label: t('dashboard.courses'),
            href: "/dashboard/admin/courses",
        },
        {
            icon: Calendar,
            label: (() => {
                const translation = t('admin.timetables');
                // If translation returns the key, use fallback
                return translation !== 'admin.timetables' ? translation : (t('dashboard.timetable') !== 'dashboard.timetable' ? t('dashboard.timetable') : 'Timetables');
            })(),
            href: "/dashboard/admin/timetables",
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
            icon: Award,
            label: t('dashboard.grades'),
            href: "/dashboard/admin/grades",
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
            icon: Ticket,
            label: t('admin.promocodeManagement') || 'Promocode Management',
            href: "/dashboard/admin/promocodes",
        },
        {
            icon: Award,
            label: t('certificates.certificates') || 'Certificates',
            href: "/dashboard/admin/certificates",
        },
        {
            icon: MessageSquare,
            label: t('admin.studentMessages') || 'Student Messages',
            href: "/dashboard/admin/messages",
        },
        {
            icon: Ticket,
            label: t('admin.subscriptionPlans') || 'Subscription Plans',
            href: "/dashboard/admin/subscription-plans",
        },
        {
            icon: BarChart,
            label: t('dashboard.analytics'),
            href: "/dashboard/admin/analytics",
        },
    ];

    const supervisorRoutes = [
        {
            icon: UserCheck,
            label: t('admin.staffAndTeachers'),
            href: "/dashboard/supervisor/staff",
        },
        {
            icon: GraduationCap,
            label: t('admin.studentsManagement'),
            href: "/dashboard/supervisor/students",
        },
        {
            icon: TrendingUp,
            label: t('admin.studentProgress'),
            href: "/dashboard/supervisor/progress",
        },
        {
            icon: BookOpen,
            label: t('admin.addRemoveCourses'),
            href: "/dashboard/supervisor/add-courses",
        },
        {
            icon: GraduationCap,
            label: t('admin.teachersManagement') || 'Teachers',
            href: "/dashboard/supervisor/teachers",
        },
        {
            icon: BookOpen,
            label: 'المواد',
            href: "/dashboard/supervisor/courses",
        },
        {
            icon: Calendar,
            label: 'إدارة الجداول الزمنية',
            href: "/dashboard/supervisor/timetables",
        },
        {
            icon: FileText,
            label: 'إدارة الاختبارات',
            href: "/dashboard/supervisor/quizzes",
        },
        {
            icon: Award,
            label: 'إدارة الشهادات',
            href: "/dashboard/supervisor/certificates",
        },
        {
            icon: Video,
            label: 'إدارة البثوث',
            href: "/dashboard/supervisor/livestreams",
        },
        {
            icon: Award,
            label: 'إدارة الدرجات',
            href: "/dashboard/supervisor/grades",
        },
        {
            icon: MessageSquare,
            label: 'رسائل الطلاب',
            href: "/dashboard/supervisor/messages",
        },
    ];

    const routes =
        role === "ADMIN" ? adminRoutes :
        role === "SUPERVISOR" ? supervisorRoutes :
        role === "TEACHER" ? teacherRoutes :
        role === "PARENT" ? parentRoutes :
        guestRoutes;

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
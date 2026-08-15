"use client";

import { CourseNavbar } from "./_components/course-navbar";
import { CourseSidebar } from "./_components/course-sidebar";

const CourseLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <div className="min-h-screen flex flex-col course-layout">
            <div className="h-14 md:h-16 fixed inset-x-0 top-0 w-full z-50">
                <CourseNavbar />
            </div>
            {/* Hide fixed sidebar on short landscape phones (width can exceed md) */}
            <div className="hidden md:flex [@media(orientation:landscape)_and_(max-height:500px)]:!hidden h-[calc(100vh-4rem)] w-64 md:w-80 flex-col fixed inset-y-0 top-16 right-0 z-40 border-l">
                <CourseSidebar />
            </div>
            <main className="pt-14 md:pt-16 flex-1 md:pr-64 lg:pr-80 [@media(orientation:landscape)_and_(max-height:500px)]:!pr-0">
                {children}
            </main>
        </div>
    );
}

export default CourseLayout; 
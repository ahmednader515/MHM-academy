"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/contexts/language-context";
import toast from "react-hot-toast";
import axios from "axios";

interface User {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

const AdminCreateCoursePage = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(true);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [supervisors, setSupervisors] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users");
            if (response.ok) {
                const users = await response.json();
                // Filter teachers, admins, and supervisors
                const teacherUsers = users.filter((user: User) => user.role === "TEACHER");
                const adminUsers = users.filter((user: User) => user.role === "ADMIN");
                const supervisorUsers = users.filter((user: User) => user.role === "SUPERVISOR");
                setTeachers(teacherUsers);
                setAdmins(adminUsers);
                setSupervisors(supervisorUsers);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(t('common.error') || 'Error loading users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async () => {
        if (!selectedUserId) {
            toast.error("يرجى اختيار معلم أو مشرف");
            return;
        }

        setCreating(true);
        try {
            const response = await axios.post("/api/courses/create-for-user", {
                userId: selectedUserId,
                title: "مادة غير معرفة"
            });

            if (response.data?.id) {
                toast.success(t('teacher.courseCreatedSuccessfully') || 'Course created successfully');
                router.push(`/dashboard/admin/courses/${response.data.id}`);
            } else {
                throw new Error("Failed to create course");
            }
        } catch (error) {
            console.error("Error creating course:", error);
            toast.error(t('teacher.courseCreationError') || 'Error creating course');
        } finally {
            setCreating(false);
        }
    };

    const handleCancel = () => {
        router.push("/dashboard/admin/courses");
    };

    const allUsers = [...teachers, ...admins, ...supervisors].sort((a, b) => a.fullName.localeCompare(b.fullName));

    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
                handleCancel();
            }
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>اختر المعلم أو المشرف</DialogTitle>
                    <DialogDescription>
                        اختر المعلم أو المشرف الذي سيتم إنشاء المادة له
                    </DialogDescription>
                </DialogHeader>
                
                {loading ? (
                    <div className="py-4 text-center">جاري التحميل...</div>
                ) : (
                    <div className="space-y-4 py-4">
                        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر المعلم أو المشرف" />
                            </SelectTrigger>
                            <SelectContent 
                                position="popper"
                                side="bottom"
                                sideOffset={4}
                                className="max-h-[300px] overflow-y-auto"
                            >
                                {allUsers.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.fullName} ({user.role === "TEACHER" ? "معلم" : user.role === "ADMIN" ? "مشرف" : "مشرف"})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel} disabled={creating}>
                        إلغاء
                    </Button>
                    <Button onClick={handleCreateCourse} disabled={!selectedUserId || creating || loading}>
                        {creating ? "جاري الإنشاء..." : "إنشاء المادة"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminCreateCoursePage;

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
import { CurriculumSelector } from "@/components/curriculum-selector";
import { Settings, User, GraduationCap } from "lucide-react";

type Curriculum = "egyptian" | "saudi" | "summer_courses" | "center_mhm_academy";
type CurriculumType = "morning" | "evening";
type Level = "kg" | "primary" | "preparatory" | "secondary" | "summer_levels";

interface ProfileFormData {
    fullName: string;
    phoneNumber: string;
    email: string;
    parentPhoneNumber: string;
    curriculum: Curriculum | null;
    curriculumType: CurriculumType | null;
    level: Level | null;
    language: string | null;
    grade: string | null;
}

export function SettingsContent() {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<ProfileFormData>({
        fullName: "",
        phoneNumber: "",
        email: "",
        parentPhoneNumber: "",
        curriculum: null,
        curriculumType: null,
        level: null,
        language: null,
        grade: null,
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await fetch("/api/user/profile");
            if (!response.ok) {
                throw new Error("Failed to fetch profile");
            }
            const data = await response.json();
            setFormData({
                fullName: data.fullName ?? "",
                phoneNumber: data.phoneNumber ?? "",
                email: data.email ?? "",
                parentPhoneNumber: data.parentPhoneNumber ?? "",
                curriculum: data.curriculum ?? null,
                curriculumType: data.curriculumType ?? null,
                level: data.level ?? null,
                language: data.language ?? null,
                grade: data.grade ?? null,
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
            toast.error(t("common.error"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.fullName.trim() || !formData.phoneNumber.trim() || !formData.email.trim() || !formData.parentPhoneNumber.trim()) {
            toast.error(t("dashboard.fillRequiredFields") || "يرجى ملء جميع الحقول المطلوبة");
            return false;
        }
        if (!formData.curriculum) {
            toast.error(t("dashboard.selectCurriculum") || "يرجى اختيار المنهج");
            return false;
        }
        if (formData.curriculum === "egyptian" && !formData.curriculumType) {
            toast.error(t("dashboard.selectCurriculumType") || "يرجى اختيار نوع المنهج");
            return false;
        }
        if (!formData.level) {
            toast.error(t("dashboard.selectLevel") || "يرجى اختيار المرحلة");
            return false;
        }
        if (!formData.grade) {
            toast.error(t("dashboard.selectGrade") || "يرجى اختيار الصف");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success(t("dashboard.profileUpdated") || t("common.success"));
            } else {
                const error = await response.text();
                if (error.includes("Phone number")) {
                    toast.error(t("auth.phoneAlreadyExists") || error);
                } else if (error.includes("Email")) {
                    toast.error(t("auth.emailAlreadyExists") || error);
                } else {
                    toast.error(error || t("common.error"));
                }
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(t("common.error"));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#211FC3] mx-auto" />
                    <p className="mt-2 text-muted-foreground">{t("common.loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold">{t("dashboard.settings")}</h1>
                <p className="text-muted-foreground">
                    {t("dashboard.settingsDescription") || "تحديث بيانات حسابك والمنهج والصف"}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            {t("profile.personalInfo")}
                        </CardTitle>
                        <CardDescription>
                            {t("profile.contactInfo")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                required
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">{t("auth.phoneNumber")}</Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                required
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("auth.email")}</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled={isSaving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parentPhoneNumber">{t("auth.parentPhoneNumber")}</Label>
                            <Input
                                id="parentPhoneNumber"
                                name="parentPhoneNumber"
                                type="tel"
                                value={formData.parentPhoneNumber}
                                onChange={handleInputChange}
                                required
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("auth.parentPhoneNumberHelp")}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            {t("profile.education")}
                        </CardTitle>
                        <CardDescription>
                            {t("dashboard.curriculumSettingsDescription") || "اختر المنهج والمرحلة والصف المناسبين لك"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CurriculumSelector
                            selectedCurriculum={formData.curriculum}
                            selectedCurriculumType={formData.curriculumType}
                            selectedLevel={formData.level}
                            selectedLanguage={formData.language}
                            selectedGrade={formData.grade}
                            onCurriculumChange={(curriculum) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    curriculum,
                                    curriculumType: curriculum !== "egyptian" ? null : prev.curriculumType,
                                    level: null,
                                    language: null,
                                    grade: null,
                                }))
                            }
                            onCurriculumTypeChange={(curriculumType) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    curriculumType,
                                    level: null,
                                    language: null,
                                    grade: null,
                                }))
                            }
                            onLevelChange={(level) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    level,
                                    language: null,
                                    grade: null,
                                }))
                            }
                            onLanguageChange={(language) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    language,
                                    grade: null,
                                }))
                            }
                            onGradeChange={(grade) =>
                                setFormData((prev) => ({ ...prev, grade }))
                            }
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-[#211FC3] hover:bg-[#211FC3]/90"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        {isSaving ? t("common.loading") : t("profile.saveChanges")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

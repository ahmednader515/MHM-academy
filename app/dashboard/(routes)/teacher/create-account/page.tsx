"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle, Check, X } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/lib/contexts/language-context";
import { CurriculumSelector } from "@/components/curriculum-selector";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

export default function CreateAccountPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    parentPhoneNumber: "",
    curriculum: null as 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null,
    level: null as 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null,
    language: null as 'arabic' | 'languages' | null,
    grade: null as string | null,
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCurriculumChange = (curriculum: 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null) => {
    setFormData((prev) => ({
      ...prev,
      curriculum,
      level: null, // Reset level when curriculum changes
      language: null, // Reset language when curriculum changes
      grade: null, // Reset grade when curriculum changes
    }));
  };

  const handleLevelChange = (level: 'kg' | 'primary' | 'preparatory' | 'secondary' | 'summer_levels' | null) => {
    setFormData((prev) => ({
      ...prev,
      level,
      language: null, // Reset language when level changes
      grade: null, // Reset grade when level changes
    }));
  };

  const handleLanguageChange = (language: 'arabic' | 'languages' | null) => {
    setFormData((prev) => ({
      ...prev,
      language,
      grade: null, // Reset grade when language changes
    }));
  };

  const handleGradeChange = (grade: string | null) => {
    setFormData((prev) => ({
      ...prev,
      grade,
    }));
  };

  const formValidation = {
    passwordMatch: formData.password === formData.confirmPassword,
    isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formValidation.isValid) {
      toast.error(t('teacher.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/teacher/create-account", formData);
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success(t('teacher.accountCreatedSuccessfully'));
        // Reset form
        setFormData({
          fullName: "",
          phoneNumber: "",
          email: "",
          parentPhoneNumber: "",
          curriculum: null,
          level: null,
          language: null,
          grade: null,
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = typeof axiosError.response.data === 'string' 
          ? axiosError.response.data 
          : (axiosError.response.data as any)?.error || (axiosError.response.data as any)?.message || '';
        
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t('teacher.phoneAlreadyExists'));
        } else if (errorMessage.includes("Email already exists")) {
          toast.error(t('teacher.emailAlreadyExists'));
        } else if (errorMessage.includes("Invalid email format")) {
          toast.error(t('teacher.invalidEmailFormat'));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t('teacher.passwordsDoNotMatch'));
        } else if (errorMessage.includes("Parent phone number")) {
          toast.error(errorMessage);
        } else if (errorMessage.includes("Missing required fields")) {
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage || t('teacher.accountCreationError'));
        }
      } else {
        toast.error(t('teacher.accountCreationError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      phoneNumber: "",
      email: "",
      parentPhoneNumber: "",
      curriculum: null,
      level: null,
      language: null,
      grade: null,
      password: "",
      confirmPassword: "",
    });
    setCreatedUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher/courses">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('teacher.back')}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('teacher.createNewStudentAccount')}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                {t('teacher.accountCreatedSuccessfully')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('teacher.fullName')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('teacher.phoneNumber')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  {t('teacher.createAnotherAccount')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/teacher/courses">
                    {t('teacher.backToCourses')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t('teacher.studentInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('teacher.fullName')}</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('teacher.phoneNumber')}</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+20XXXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('teacher.email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="student@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentPhoneNumber">{t('teacher.parentPhoneNumber')}</Label>
                  <Input
                    id="parentPhoneNumber"
                    name="parentPhoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    disabled={isLoading}
                    className="h-10"
                    value={formData.parentPhoneNumber}
                    onChange={handleInputChange}
                    placeholder="+20XXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('teacher.parentPhoneNumberHelp')}
                  </p>
                </div>

                <CurriculumSelector
                  selectedCurriculum={formData.curriculum}
                  selectedLevel={formData.level}
                  selectedLanguage={formData.language}
                  selectedGrade={formData.grade}
                  onCurriculumChange={handleCurriculumChange}
                  onLevelChange={handleLevelChange}
                  onLanguageChange={handleLanguageChange}
                  onGradeChange={handleGradeChange}
                />

                <div className="space-y-2">
                  <Label htmlFor="password">{t('teacher.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className="h-10"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute rtl:left-0 ltr:right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('teacher.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className="h-10"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute rtl:left-0 ltr:right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {formValidation.passwordMatch ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">{t('teacher.passwordsMatch')}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 bg-[#090919] hover:bg-[#090919]/90 text-white"
                  disabled={isLoading || !formValidation.isValid}
                >
                  {isLoading ? t('teacher.creating') : t('teacher.createAccount')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
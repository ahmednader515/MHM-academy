"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Check, X, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/contexts/language-context";
import { CurriculumSelector } from "@/components/curriculum-selector";
import ReCAPTCHA from "react-google-recaptcha";

export default function SignUpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    parentPhoneNumber: "",
    curriculum: null as 'egyptian' | 'saudi' | 'summer_courses' | 'center_mhm_academy' | null,
    curriculumType: null as 'morning' | 'evening' | null,
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
      curriculumType: curriculum !== 'egyptian' ? null : prev.curriculumType, // Reset if not egyptian
      level: null, // Reset level when curriculum changes
      language: null, // Reset language when curriculum changes
      grade: null, // Reset grade when curriculum changes
    }));
  };

  const handleCurriculumTypeChange = (curriculumType: 'morning' | 'evening' | null) => {
    setFormData((prev) => ({
      ...prev,
      curriculumType,
      level: null, // Reset level when curriculum type changes
      language: null, // Reset language when curriculum type changes
      grade: null, // Reset grade when curriculum type changes
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

  const validateForm = () => {
    const passwordValid = formData.password === formData.confirmPassword && formData.password.length > 0;
    const curriculumValid = formData.curriculum !== null;
    // If Egyptian curriculum is selected, curriculumType is required
    const curriculumTypeValid = formData.curriculum !== 'egyptian' || formData.curriculumType !== null;
    const levelValid = formData.level !== null;
    const gradeValid = formData.grade !== null;
    
    return {
      passwordMatch: formData.password === formData.confirmPassword,
      passwordValid,
      curriculumValid,
      curriculumTypeValid,
      levelValid,
      gradeValid,
      isValid: passwordValid && curriculumValid && curriculumTypeValid && levelValid && gradeValid,
    };
  };

  const formValidation = validateForm();

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formValidation.isValid) {
      if (!formValidation.passwordValid) {
        toast.error(t('auth.passwordsDoNotMatch'));
      } else if (!formValidation.curriculumValid) {
        toast.error('يرجى اختيار المنهج');
      } else if (!formValidation.curriculumTypeValid) {
        toast.error('يرجى اختيار نوع المنهج');
      } else if (!formValidation.levelValid) {
        toast.error('يرجى اختيار المرحلة');
      } else if (!formValidation.gradeValid) {
        toast.error('يرجى اختيار الصف');
      }
      setIsLoading(false);
      return;
    }

    // Check reCAPTCHA
    if (!recaptchaToken) {
      toast.error(t('auth.recaptchaRequired') || 'يرجى إكمال التحقق من reCAPTCHA');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/register", {
        ...formData,
        recaptchaToken,
      });
      
      if (response.data.success) {
        toast.success(t('auth.signUpSuccess'));
        router.push("/sign-in");
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        // Check for phone number errors
        if (errorMessage.includes("phone number") || errorMessage.includes("Phone number") || errorMessage.includes("phoneNumber")) {
          if (errorMessage.includes("already registered") || errorMessage.includes("already exists")) {
            toast.error(t('auth.phoneAlreadyExists') || 'رقم الهاتف مسجل بالفعل. يرجى استخدام رقم آخر أو محاولة تسجيل الدخول');
          } else {
            toast.error(errorMessage || t('auth.phoneAlreadyExists'));
          }
        } 
        // Check for email errors
        else if (errorMessage.includes("email") || errorMessage.includes("Email")) {
          if (errorMessage.includes("already registered") || errorMessage.includes("already exists")) {
            toast.error(t('auth.emailAlreadyExists') || 'البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر أو محاولة تسجيل الدخول');
          } else if (errorMessage.includes("Invalid") || errorMessage.includes("invalid")) {
            toast.error(t('auth.invalidEmailFormat'));
          } else {
            toast.error(errorMessage || t('auth.emailAlreadyExists'));
          }
        }
        // Check for password errors
        else if (errorMessage.includes("Passwords do not match") || errorMessage.includes("password")) {
          toast.error(t('auth.passwordsDoNotMatch'));
        }
        // Check for reCAPTCHA errors
        else if (errorMessage.includes("reCAPTCHA") || errorMessage.includes("Invalid reCAPTCHA")) {
          toast.error(t('auth.recaptchaFailed') || 'فشل التحقق من reCAPTCHA. يرجى المحاولة مرة أخرى');
          recaptchaRef.current?.reset();
          setRecaptchaToken(null);
        }
        // Check for parent phone number errors
        else if (errorMessage.includes("parent") || errorMessage.includes("Parent")) {
          toast.error(errorMessage || 'خطأ في رقم هاتف ولي الأمر');
        }
        // Check for missing fields
        else if (errorMessage.includes("Missing required fields") || errorMessage.includes("required")) {
          toast.error('يرجى ملء جميع الحقول المطلوبة');
        }
        // For any other error, show the actual error message from the API
        else {
          toast.error(errorMessage || t('auth.signUpError'));
        }
      } else {
        toast.error(t('auth.signUpError') || 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى');
      }
      // Reset reCAPTCHA on error
      recaptchaRef.current?.reset();
      setRecaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#090919]/8 to-[#090919]/4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#090919]/6"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 mx-auto">
              <Image
                src="/logo.png"
                alt="Teacher"
                fill
                className="object-cover rounded-full border-4 border-[#090919]/20 shadow-2xl"
                unoptimized
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#090919]">
                {t('auth.welcomeToMHMAcademy')}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('auth.joinUsToday')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight mt-8">
              {t('auth.signUp')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('auth.enterDataToCreateAccount')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
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
              <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
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
              <Label htmlFor="email">{t('auth.email')}</Label>
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
              <Label htmlFor="parentPhoneNumber">{t('auth.parentPhoneNumber')}</Label>
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
                {t('auth.parentPhoneNumberHelp')}
              </p>
            </div>
        <CurriculumSelector
          selectedCurriculum={formData.curriculum}
          selectedCurriculumType={formData.curriculumType}
          selectedLevel={formData.level}
          selectedLanguage={formData.language}
          selectedGrade={formData.grade}
          onCurriculumChange={handleCurriculumChange}
          onCurriculumTypeChange={handleCurriculumTypeChange}
          onLevelChange={handleLevelChange}
          onLanguageChange={handleLanguageChange}
          onGradeChange={handleGradeChange}
        />
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
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
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
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
                <span className="text-sm text-muted-foreground">{t('auth.passwordsMatch')}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={handleRecaptchaChange}
                theme="light"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#090919] hover:bg-[#090919]/90 text-white"
              disabled={isLoading || !formValidation.isValid || !recaptchaToken}
            >
              {isLoading ? t('auth.signingUp') : t('auth.signUp')}
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t('auth.hasAccount')} </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline transition-colors"
            >
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
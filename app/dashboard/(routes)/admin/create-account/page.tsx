"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useLanguage } from "@/lib/contexts/language-context";

interface CreatedUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
}

// Dropdown options
const collegeOptions = [
  "الجامعة المصرية الصينية",
  "جامعة الدلتا",
  "جامعة القاهرة الأهلية",
  "جامعة المنوفية الأهلية",
  "جامعة سفنكس",
  "جامعة السادات الأهلية"
];

const facultyOptions = [
  "كلية الطب البيطري",
  "كلية العلاج الطبيعي",
  "كلية الصيدلة",
  "كلية طب أسنان"
];

export default function CreateAccountPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    college: "",
    faculty: "",
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error(t('dashboard.passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/admin/create-account", formData);
      
      if (response.data.success) {
        setCreatedUser(response.data.user);
        toast.success(t('dashboard.accountCreatedSuccessfully'));
        // Reset form
        setFormData({
          fullName: "",
          phoneNumber: "",
          email: "",
          college: "",
          faculty: "",
          level: "",
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error(t('dashboard.phoneAlreadyExists'));
        } else if (errorMessage.includes("Email already exists")) {
          toast.error(t('dashboard.emailAlreadyExists'));
        } else if (errorMessage.includes("Invalid email format")) {
          toast.error(t('dashboard.invalidEmailFormat'));
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error(t('dashboard.passwordsDoNotMatch'));
        } else {
          toast.error(t('dashboard.accountCreationError'));
        }
      } else {
        toast.error(t('dashboard.accountCreationError'));
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
      college: "",
      faculty: "",
      level: "",
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
            <Link href="/dashboard/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('dashboard.back')}
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.createNewStudentAccount')}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {createdUser ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                {t('dashboard.accountCreatedSuccessfully')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('dashboard.fullName')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('dashboard.phoneNumber')}</Label>
                  <p className="text-green-800 dark:text-green-200 font-semibold">{createdUser.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700 text-white">
                  {t('dashboard.createAnotherAccount')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/admin/users">
                    {t('dashboard.viewAllUsers')}
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
                {t('dashboard.studentInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('dashboard.fullName')} *</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder={t('dashboard.enterFullName')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">{t('dashboard.phoneNumber')} *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder={t('dashboard.enterPhoneNumber')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('dashboard.email')} *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={t('dashboard.enterEmail')}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="college">{t('dashboard.collegeOptional')}</Label>
                    <Select
                      value={formData.college}
                      onValueChange={(value) => handleSelectChange("college", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.selectCollege')} />
                      </SelectTrigger>
                      <SelectContent>
                        {collegeOptions.map((college) => (
                          <SelectItem key={college} value={college}>
                            {college}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faculty">{t('dashboard.facultyOptional')}</Label>
                    <Select
                      value={formData.faculty}
                      onValueChange={(value) => handleSelectChange("faculty", value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dashboard.selectFaculty')} />
                      </SelectTrigger>
                      <SelectContent>
                        {facultyOptions.map((faculty) => (
                          <SelectItem key={faculty} value={faculty}>
                            {faculty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('dashboard.password')} *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t('dashboard.enterPassword')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`absolute top-0 h-full px-3 py-2 hover:bg-transparent ${isRTL ? 'left-0' : 'right-0'}`}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('dashboard.confirmPassword')} *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder={t('dashboard.confirmPasswordPlaceholder')}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`absolute top-0 h-full px-3 py-2 hover:bg-transparent ${isRTL ? 'left-0' : 'right-0'}`}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {formData.password && formData.confirmPassword && (
                  <div className={`text-sm ${passwordChecks.match ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordChecks.match ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        {t('dashboard.passwordsMatch')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                        {t('dashboard.passwordsDoNotMatch')}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !passwordChecks.isValid}
                    className="flex-1 bg-[#090919] hover:bg-[#090919]/90 text-white"
                  >
                    {isLoading ? t('dashboard.creating') : t('dashboard.createAccount')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    {t('dashboard.resetForm')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { getDashboardUrlByRole } from "@/lib/utils";
import { useLanguage } from "@/lib/contexts/language-context";

export default function SignInPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error cases
        if (result.error === "UserNotFound") {
          toast.error(t('auth.userNotFound'));
        } else if (result.error === "WrongPassword") {
          toast.error(t('auth.wrongPassword'));
        } else if (result.error === "MissingCredentials") {
          toast.error(t('auth.missingCredentials'));
        } else if (result.error === "ServerError") {
          toast.error(t('auth.serverError'));
        } else if (result.error === "CredentialsSignin") {
          // Fallback for generic credentials error
          toast.error(t('auth.invalidCredentials'));
        } else if (result.error === "UserAlreadyLoggedIn") {
          toast.error(t('auth.userAlreadyLoggedIn'));
        } else {
          toast.error(t('auth.signInError'));
        }
        return;
      }

      if (!result?.ok) {
        return;
      }

      toast.success(t('auth.signInSuccess'));
      
      // Get user role from session with retries
      // On Vercel, cookies might take a moment to be set, so we retry
      let userRole = "USER";
      let sessionData = null;
      const maxRetries = 5;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          // Wait progressively longer on each retry
          await new Promise(resolve => setTimeout(resolve, 200 * (retries + 1)));
          
          const response = await fetch("/api/auth/session", { 
            cache: "no-store",
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          
          if (response.ok) {
            sessionData = await response.json();
            
            if (sessionData?.user?.role) {
              userRole = sessionData.user.role;
              break;
            }
          }
        } catch (error) {
          console.error(`Session fetch attempt ${retries + 1} error:`, error);
        }
        
        retries++;
      }
      
      // If we still don't have a role after all retries, default to USER
      // The proxy will handle redirecting to the correct dashboard on the next request
      if (!sessionData?.user?.role) {
        console.warn("Could not fetch user role from session, defaulting to USER");
      }
      
      const dashboardUrl = getDashboardUrlByRole(userRole);

      // Use window.location.href for a hard navigation that ensures cookies are sent
      // This is important for Vercel where cookies need to be properly set
      if (typeof window !== "undefined") {
        // Add a small delay to ensure cookie is set before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        window.location.href = dashboardUrl;
      } else {
        router.replace(dashboardUrl);
      }
    } catch (error) {
      // Handle network errors or other unexpected errors
      console.error("Sign in error:", error);
      toast.error(t('auth.serverError'));
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
                {t('auth.welcomeBack')}
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('auth.signInSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {t('auth.signIn')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('auth.enterPhonePassword')}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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

            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText={t('auth.signingIn')}
              className="w-full h-10 bg-[#090919] hover:bg-[#090919]/90 text-white"
            >
              {t('auth.signIn')}
            </LoadingButton>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">{t('auth.noAccount')} </span>
            <Link 
              href="/sign-up" 
              className="text-primary hover:underline transition-colors"
            >
              {t('auth.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
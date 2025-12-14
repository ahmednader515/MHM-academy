"use client";

import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";

interface CaptchaGateProps {
  children: React.ReactNode;
}

export function CaptchaGate({ children }: CaptchaGateProps) {
  const { t } = useLanguage();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    // Check if user has already verified in this session
    const verified = sessionStorage.getItem("captcha_verified");
    if (verified === "true") {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  const handleRecaptchaChange = (token: string | null) => {
    if (token) {
      // Verify the token with the backend
      verifyCaptchaToken(token);
    }
  };

  const verifyCaptchaToken = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify-captcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        // Mark as verified in session storage
        sessionStorage.setItem("captcha_verified", "true");
        setIsVerified(true);
      } else {
        // Reset captcha on failure
        recaptchaRef.current?.reset();
        alert(t('auth.captchaVerificationError'));
      }
    } catch (error) {
      console.error("Captcha verification error:", error);
      recaptchaRef.current?.reset();
      alert(t('auth.captchaVerificationGenericError'));
    }
  };

  // Show loading state while checking session storage
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show captcha gate if not verified
  if (!isVerified) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[9999]">
        <div className="max-w-md w-full mx-4 p-8 bg-card border rounded-lg shadow-lg">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" suppressHydrationWarning>{t('auth.captchaGateTitle')}</h2>
              <p className="text-muted-foreground" suppressHydrationWarning>
                {t('auth.captchaGateDescription')}
              </p>
            </div>
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={handleRecaptchaChange}
                theme="light"
              />
            </div>
            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
              {t('auth.captchaGateHelp')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children once verified
  return <>{children}</>;
}

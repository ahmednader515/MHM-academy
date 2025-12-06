"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { ScrollProgress } from "@/components/scroll-progress";
import { LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/contexts/language-context";

export const Navbar = () => {
  const { data: session } = useSession();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      // Call our logout API to end the session
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      // Then sign out from NextAuth
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-28">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Logo"
              width={120}
              height={120}
              className="ml-2"
              unoptimized
            />
          </Link>

          {/* Right side items */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {!session ? (
              <>
                <Button className="bg-[#090919] hover:bg-[#090919]/90 text-white" asChild>
                  <Link href="/sign-up">{t('navigation.signUp')}</Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="border-[#090919] text-[#090919] hover:bg-[#090919]/10"
                >
                  <Link href="/sign-in">{t('navigation.signIn')}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">{t('navigation.dashboard')}</Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out"
                >
                  <LogOut className="h-4 w-4 rtl:ml-2 ltr:mr-2"/>
                  {t('navigation.logout')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <ScrollProgress />
    </div>
  );
}; 
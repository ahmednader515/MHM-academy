"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button"
import { LogOut, Star } from "lucide-react";
import Link from "next/link";
import { UserButton } from "./user-button";
import { useSession, signOut } from "next-auth/react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/contexts/language-context";
import { Badge } from "@/components/ui/badge";

export const NavbarRoutes = () => {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [userPoints, setUserPoints] = useState<number | null>(null);

    // Fetch user points from API
    const fetchUserPoints = async () => {
        if (session?.user && session.user.role === "USER") {
            try {
                const response = await fetch('/api/user/points');
                if (response.ok) {
                    const userData = await response.json();
                    setUserPoints(userData.points);
                }
            } catch (error) {
                console.error('Error fetching user points:', error);
            }
        }
    };

    useEffect(() => {
        fetchUserPoints();
    }, [session]);

    // Listen for points updates
    useEffect(() => {
        const handlePointsUpdate = () => {
            fetchUserPoints();
        };

        window.addEventListener('pointsUpdated', handlePointsUpdate);
        return () => {
            window.removeEventListener('pointsUpdated', handlePointsUpdate);
        };
    }, [session]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
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
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex items-center gap-x-2 rtl:mr-auto ltr:ml-auto">
            {/* Points display for students */}
            {session?.user && session.user.role === "USER" && userPoints !== null && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                    <Star className="h-3 w-3" />
                    {userPoints} {t('navigation.points') || 'Points'}
                </Badge>
            )}
            
            {/* Logout button for all user types */}
            {session?.user && (
                <LoadingButton 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    loadingText={t('dashboard.loggingOut')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out"
                >
                    <LogOut className="h-4 w-4 rtl:ml-2 ltr:mr-2"/>
                    {t('navigation.logout')}
                </LoadingButton>
            )}
            
            <UserButton />
        </div>
    )
}
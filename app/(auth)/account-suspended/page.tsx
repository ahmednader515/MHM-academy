"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { signOut } from "next-auth/react";

export default function AccountSuspendedPage() {
    const { t, isRTL } = useLanguage();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        router.push("/sign-in");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="h-16 w-16 text-orange-500" />
                    </div>
                    <CardTitle className="text-2xl">
                        {t('auth.accountSuspended') || "Account Suspended"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {t('auth.accountSuspendedMessage') || "Your account has been suspended by the admin. Please contact support for more details."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button 
                        onClick={handleSignOut}
                        className="w-full"
                        variant="outline"
                    >
                        {t('auth.signOut') || "Sign Out"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}


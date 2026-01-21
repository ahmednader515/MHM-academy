"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/language-context";

export default function SupervisorRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace("/dashboard/supervisor/staff");
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg">{t("dashboard.redirecting")}</div>
      </div>
    </div>
  );
}



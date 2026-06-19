import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardUrlByRole } from "@/lib/utils";
import { SettingsContent } from "./_components/settings-content";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        return redirect("/");
    }

    if (session.user.role === "USER" && session.user.isSuspended) {
        return redirect("/account-suspended");
    }

    if (session.user.role !== "USER") {
        return redirect(getDashboardUrlByRole(session.user.role));
    }

    return <SettingsContent />;
}

import { Suspense } from "react";
import CreateTeacherLiveStreamClient from "./_components/create-livestream-client";

export const dynamic = "force-dynamic";

export default function CreateTeacherLiveStreamPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CreateTeacherLiveStreamClient />
    </Suspense>
  );
}

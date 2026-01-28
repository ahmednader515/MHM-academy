import { Suspense } from "react";
import CreateLiveStreamClient from "./_components/create-livestream-client";

export const dynamic = "force-dynamic";

export default function CreateLiveStreamPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CreateLiveStreamClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import { Chat } from "@/components/Chat";

export default function WikiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Chat defaultMode="knowledge" />
      </div>
    </Suspense>
  );
}

import { DocumentManager } from "@/components/DocumentManager";

export default function DocumentsPage() {
  return (
    <div className="h-screen overflow-y-auto p-6 md:p-10">
      <DocumentManager />
    </div>
  );
}

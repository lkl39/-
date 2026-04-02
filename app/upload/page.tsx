import { UploadPage } from "@/components/dashboard/pages/upload/upload-page";
import { DashboardLayout } from "@/components/dashboard/shell/dashboard-layout";
import { getDashboardShellData } from "@/lib/dashboard/workbench";

export default async function UploadRoutePage() {
  const shellData = await getDashboardShellData();

  return (
    <DashboardLayout {...shellData}>
      <UploadPage />
    </DashboardLayout>
  );
}

import { StaticInnerPage } from "@/components/dashboard/static-inner-page";

type DashboardAnalysesPageProps = {
  searchParams?: Promise<{
    logId?: string;
  }>;
};

export default async function DashboardAnalysesPage({
  searchParams,
}: DashboardAnalysesPageProps) {
  const params = (await searchParams) ?? {};
  const logId = typeof params.logId === "string" ? params.logId.trim() : "";
  const src = logId
    ? `/inner-pages/\u5206\u6790\u62a5\u544a/code.html?logId=${encodeURIComponent(logId)}`
    : "/inner-pages/\u5206\u6790\u62a5\u544a/code.html";

  return <StaticInnerPage src={src} title={"\u5206\u6790\u62a5\u544a"} />;
}
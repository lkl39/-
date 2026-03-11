import { StatusPill } from "@/components/dashboard/status-pill";

type AuthNoticeProps = {
  configured: boolean;
  status?: string;
  message?: string;
};

export function AuthNotice({
  configured,
  status,
  message,
}: AuthNoticeProps) {
  const tone =
    status === "error" ? "danger" : status === "success" ? "success" : "info";

  const fallbackMessage = configured
    ? "Supabase 已接入依赖，填好环境变量后即可启用真实认证。"
    : "当前还没有填写 Supabase 项目环境变量，表单会给出配置提示。";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_55px_rgba(2,8,18,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Auth Status</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {message ?? fallbackMessage}
          </p>
        </div>
        <StatusPill
          label={configured ? "Configured Ready" : "Env Required"}
          tone={configured ? "success" : tone}
        />
      </div>
    </div>
  );
}

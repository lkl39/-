"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server-client";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

function getTrimmedValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signInAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/", "请先配置 NEXT_PUBLIC_SUPABASE_URL 和 Supabase 公钥。");
  }

  const email = getTrimmedValue(formData, "email");
  const password = getTrimmedValue(formData, "password");

  if (!email || !password) {
    return encodedRedirect("error", "/", "邮箱和密码不能为空。");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/", error.message);
  }

  return encodedRedirect("success", "/dashboard", "登录成功。");
}

export async function signUpAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/", "请先配置 NEXT_PUBLIC_SUPABASE_URL 和 Supabase 公钥。");
  }

  const email = getTrimmedValue(formData, "registerEmail");
  const password = getTrimmedValue(formData, "registerPassword");
  const teamName = getTrimmedValue(formData, "teamName");
  const { siteUrl } = getSupabaseEnv();

  if (!email || !password || !teamName) {
    return encodedRedirect("error", "/", "请完整填写注册信息。");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        team_name: teamName,
      },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return encodedRedirect("error", "/", error.message);
  }

  return encodedRedirect("success", "/", "注册请求已提交，请检查邮箱并完成验证。");
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    return encodedRedirect("error", "/", "Supabase 环境变量尚未配置。");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return encodedRedirect("success", "/", "已退出登录。");
}

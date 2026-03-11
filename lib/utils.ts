import { redirect } from "next/navigation";

export function encodedRedirect(
  status: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(
    `${path}?status=${encodeURIComponent(status)}&message=${encodeURIComponent(message)}`,
  );
}

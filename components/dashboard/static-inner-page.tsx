"use client";

import { useRef } from "react";

type StaticInnerPageProps = {
  src: string;
  title: string;
};

export function StaticInnerPage({ src, title }: StaticInnerPageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  async function syncProfileAvatar() {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      return;
    }

    try {
      const response = await fetch("/api/inner-data?view=account", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        profile?: {
          avatarUrl?: string;
          updatedAt?: string;
        };
      };

      const avatarUrl = data.profile?.avatarUrl?.trim();
      if (!avatarUrl) {
        return;
      }

      const version = data.profile?.updatedAt?.trim();
      const avatarSrc = version
        ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`
        : avatarUrl;

      doc
        .querySelectorAll<HTMLImageElement>('img[alt="\u7528\u6237\u5934\u50cf"]')
        .forEach((img) => {
          img.src = avatarSrc;
        });
    } catch (error) {
      console.error("Failed to sync iframe avatar:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[#EBDEC6] p-4 md:p-6">
      <section className="mx-auto h-[calc(100vh-2rem)] w-full max-w-[1800px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.12)] md:h-[calc(100vh-3rem)]">
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          className="h-full w-full border-0"
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={syncProfileAvatar}
        />
      </section>
    </main>
  );
}
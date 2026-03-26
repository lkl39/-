type StaticInnerPageProps = {
  src: string;
  title: string;
};

export function StaticInnerPage({ src, title }: StaticInnerPageProps) {
  return (
    <main className="min-h-screen bg-[#EBDEC6] p-4 md:p-6">
      <section className="mx-auto h-[calc(100vh-2rem)] w-full max-w-[1800px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.12)] md:h-[calc(100vh-3rem)]">
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0"
          loading="eager"
          referrerPolicy="no-referrer"
        />
      </section>
    </main>
  );
}

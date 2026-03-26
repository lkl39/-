# Next.js 集成指南

## 📁 文件结构
```
your-next-project/
├── app/
│   ├── layout.tsx              # 全局样式 + Tailwind
│   ├── page.tsx                # 首页主文件
│   └── home/
│       ├── page.tsx            # 或这里
│       ├── components/
│       │   ├── AuroraBackground.tsx
│       │   ├── AntigravityCanvas.tsx
│       │   └── HeroSection.tsx
│       └── styles/
│           └── home.module.css
├── public/
│   └── images/
│       └── 微信图片_20260325222542_206_8.jpg
└── tailwind.config.ts
```

---

## 🎯 Step 1：配置 Tailwind 和字体

**`tailwind.config.ts`**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        "tertiary-container": "#B9824A",
        "primary": "#8A5A2B",
        "secondary": "#B07A47",
        // ... 其他颜色参考原 code.html
      },
      fontFamily: {
        "headline": ["var(--font-manrope)"],
        "body": ["var(--font-inter)"],
        "label": ["var(--font-space-grotesk)"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
export default config
```

**`app/layout.tsx`**
```typescript
import type { Metadata } from "next";
import { Manrope, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: "首页 - 智能日志分析系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${manrope.variable} ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-[#EBDEC6] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
```

---

## 🎨 Step 2：创建 Aurora 组件

**`app/components/AuroraBackground.tsx`**
```typescript
export default function AuroraBackground() {
  return (
    <div className="aurora-layer" aria-hidden="true">
      <div className="aurora-band aurora-band--blue"></div>
      <div className="aurora-band aurora-band--purple"></div>
      <div className="aurora-band aurora-band--green"></div>
      <div className="aurora-fade"></div>
    </div>
  );
}
```

**在 `globals.css` 中添加样式**：
```css
.aurora-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
}

.aurora-band {
    position: absolute;
    left: -12%;
    width: 124%;
    height: 62%;
    bottom: -10%;
    border-radius: 45% 55% 40% 60% / 60% 45% 55% 40%;
    filter: blur(52px) saturate(160%);
    opacity: 0.72;
    mix-blend-mode: screen;
    transform-origin: center;
    will-change: transform, opacity;
}

.aurora-band--blue {
    background: radial-gradient(ellipse at center, rgba(95, 168, 211, 0.72) 0%, rgba(95, 168, 211, 0.0) 56%);
    opacity: 0.58;
    animation: auroraDriftA 19s ease-in-out infinite alternate;
}

.aurora-band--purple {
    background: radial-gradient(ellipse at center, rgba(161, 107, 255, 0.92) 0%, rgba(161, 107, 255, 0.08) 48%, rgba(161, 107, 255, 0.0) 62%);
    left: -22%;
    width: 112%;
    bottom: -13%;
    opacity: 0.82;
    animation: auroraDriftB 23s ease-in-out infinite alternate;
}

.aurora-band--green {
    background: radial-gradient(ellipse at center, rgba(84, 214, 161, 0.9) 0%, rgba(84, 214, 161, 0.08) 46%, rgba(84, 214, 161, 0.0) 60%);
    left: 2%;
    width: 108%;
    bottom: -16%;
    opacity: 0.76;
    animation: auroraDriftC 27s ease-in-out infinite alternate;
}

.aurora-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(235, 222, 198, 0.0) 0%, rgba(235, 222, 198, 0.58) 76%, rgba(235, 222, 198, 0.86) 100%);
}

@keyframes auroraDriftA {
    0% { transform: translateX(-4%) translateY(2%) scale(1.04) rotate(-3deg); }
    100% { transform: translateX(4%) translateY(-3%) scale(1.12) rotate(4deg); }
}

@keyframes auroraDriftB {
    0% { transform: translateX(5%) translateY(3%) scale(1.08) rotate(2deg); }
    100% { transform: translateX(-6%) translateY(-4%) scale(1.15) rotate(-4deg); }
}

@keyframes auroraDriftC {
    0% { transform: translateX(-3%) translateY(5%) scale(1.0) rotate(1deg); opacity: 0.26; }
    100% { transform: translateX(7%) translateY(-5%) scale(1.13) rotate(-3deg); opacity: 0.38; }
}

@media (prefers-reduced-motion: reduce) {
    .aurora-band--blue,
    .aurora-band--purple,
    .aurora-band--green {
        animation: none;
    }
}
```

---

## 🌀 Step 3：创建 Antigravity 粒子组件

**`app/components/AntigravityCanvas.tsx`**
```typescript
'use client';

import { useEffect, useRef } from 'react';

export default function AntigravityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = {
      count: 1200,
      magnetRadius: 140,
      ringRadius: 112,
      waveSpeed: 0.018,
      waveAmplitude: 10,
      lerpSpeed: 0.08,
      particleSize: 5.5,
      pulseSpeed: 0.08,
      autoAnimate: true,
    };

    const colors = ['rgba(0,0,0,1)', 'rgba(15,15,15,1)', 'rgba(30,30,30,1)'];
    const particles: any[] = [];
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.58 };
    const smoothPointer = { x: pointer.x, y: pointer.y };
    const lastPointer = { x: pointer.x, y: pointer.y, t: performance.now() };
    let animationId = 0;

    function random(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < config.count; i++) {
        const x = random(0, canvas!.width);
        const y = random(0, canvas!.height);
        particles.push({
          x,
          y,
          z: random(-120, 120),
          cx: x,
          cy: y,
          t: random(0, 100),
          speed: random(0.008, 0.02),
          radiusOffset: random(-10, 10),
          colorIndex: i % colors.length,
        });
      }
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(window.innerWidth * dpr);
      canvas!.height = Math.floor(window.innerHeight * dpr);
      canvas!.style.width = window.innerWidth + 'px';
      canvas!.style.height = window.innerHeight + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles();
    }

    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
      lastPointer.t = performance.now();
    }

    function draw(now: number) {
      const idleMs = now - lastPointer.t;
      if (config.autoAnimate && idleMs > 1800) {
        const t = now * 0.001;
        pointer.x = window.innerWidth * 0.5 + Math.sin(t * 0.8) * (window.innerWidth * 0.18);
        pointer.y = window.innerHeight * 0.58 + Math.cos(t * 1.1) * (window.innerHeight * 0.1);
      }

      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.06;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.06;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.t += p.speed;

        const projection = 1 - p.z / 420;
        const tx = smoothPointer.x * projection;
        const ty = smoothPointer.y * projection;
        const dx = p.x - tx;
        const dy = p.y - ty;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = p.x;
        let targetY = p.y;

        if (dist < config.magnetRadius) {
          const angle = Math.atan2(dy, dx);
          const wave = Math.sin(p.t / config.waveSpeed + angle) * config.waveAmplitude;
          const currentRing = config.ringRadius + wave + p.radiusOffset;
          targetX = tx + currentRing * Math.cos(angle);
          targetY = ty + currentRing * Math.sin(angle);
        }

        p.cx += (targetX - p.cx) * config.lerpSpeed;
        p.cy += (targetY - p.cy) * config.lerpSpeed;

        const ringDist = Math.abs(
          Math.sqrt((p.cx - tx) * (p.cx - tx) + (p.cy - ty) * (p.cy - ty)) - config.ringRadius
        );
        const nearRing = Math.max(0, 1 - ringDist / 60);
        const pulse = 0.8 + Math.sin(now * 0.001 * (3 + p.speed * 50) + p.t * config.pulseSpeed) * 0.3;
        const baseSize = Math.max(0.8, config.particleSize * nearRing * pulse * 0.6 + 0.6);

        ctx!.beginPath();
        ctx!.fillStyle = colors[p.colorIndex];
        ctx!.arc(p.cx, p.cy, baseSize, 0, Math.PI * 2);
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[2] pointer-events-none"
      aria-hidden="true"
    />
  );
}
```

---

## ✨ Step 4：创建 ShinyText 组件

**`app/components/ShinyText.tsx`**
```typescript
'use client';

import { useEffect, useRef } from 'react';

interface ShinyTextProps {
  children: React.ReactNode;
  speed?: number;
  delay?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  className?: string;
}

export default function ShinyText({
  children,
  speed = 2,
  delay = 0,
  direction = 'left',
  pauseOnHover = false,
  className = '',
}: ShinyTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let elapsed = 0;
    let last: number | null = null;
    let paused = false;
    const animationDuration = speed * 1000;
    const delayDuration = delay * 1000;
    const dir = direction === 'right' ? -1 : 1;

    const handleMouseEnter = () => { paused = true; last = null; };
    const handleMouseLeave = () => { paused = false; last = null; };

    if (pauseOnHover) {
      node.addEventListener('mouseenter', handleMouseEnter);
      node.addEventListener('mouseleave', handleMouseLeave);
    }

    function updateBackground(progress: number) {
      const bgPos = 150 - progress * 2;
      node!.style.backgroundPosition = `${bgPos}% center`;
    }

    function tick(time: number) {
      if (paused) {
        requestAnimationFrame(tick);
        return;
      }

      if (last === null) {
        last = time;
        requestAnimationFrame(tick);
        return;
      }

      elapsed += time - last;
      last = time;

      const cycleDuration = animationDuration + delayDuration;
      const cycleTime = elapsed % cycleDuration;
      let progress = 0;

      if (cycleTime < animationDuration) {
        const p = (cycleTime / animationDuration) * 100;
        progress = dir === 1 ? p : 100 - p;
      } else {
        progress = dir === 1 ? 100 : 0;
      }

      updateBackground(progress);
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    return () => {
      if (pauseOnHover) {
        node.removeEventListener('mouseenter', handleMouseEnter);
        node.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [speed, delay, direction, pauseOnHover]);

  return (
    <span
      ref={ref}
      className={`shiny-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(
          120deg,
          #352E2A 0%,
          #352E2A 35%,
          #F7F2E8 50%,
          #352E2A 65%,
          #352E2A 100%
        )`,
        backgroundSize: '200% auto',
        backgroundPosition: '150% center',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        display: 'inline-block',
        willChange: 'background-position',
      }}
    >
      {children}
    </span>
  );
}
```

---

## 🏠 Step 5：创建首页

**`app/page.tsx`**
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuroraBackground from './components/AuroraBackground';
import AntigravityCanvas from './components/AntigravityCanvas';
import ShinyText from './components/ShinyText';

export default function Home() {
  const router = useRouter();

  const handleStartAnalysis = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === '1';
    if (isLoggedIn) {
      router.push('/upload');  // 修改为你的上传页面路径
    } else {
      router.push('/login');   // 修改为你的登录页面路径
    }
  };

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: "url('/images/微信图片_20260325222542_206_8.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <AuroraBackground />
      <AntigravityCanvas />

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-xl shadow-[0_32px_64px_rgba(255,255,255,0.06)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-black tracking-tighter text-[#352E2A] uppercase font-headline flex items-center">
            <span className="material-symbols-outlined text-[#8A5A2B] mr-2">bolt</span>
            智能日志分析系统
          </div>
          <a
            href="/login"
            className="bg-[#F7F2E8] hover:bg-[#EFE4D2] transition-all duration-300 px-6 py-2 rounded-lg font-label font-bold text-xs uppercase tracking-wider text-[#8A5A2B] border border-[#B07A47]/50 shadow-[0_6px_16px_rgba(138,90,43,0.18)]"
          >
            登录/注册
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32">
        <section className="relative z-20 max-w-5xl mx-auto px-6 text-center pb-24">
          {/* Main Headline */}
          <h1 className="font-headline font-extrabold text-[48px] md:text-[80px] leading-[1.1] tracking-tight mb-6 mt-4">
            <span className="block">
              <ShinyText speed={2} delay={0.2} pauseOnHover>
                您的愿景
              </ShinyText>
            </span>
            <ShinyText speed={2.3} delay={0.35} pauseOnHover>
              我们的数字现实
            </ShinyText>
          </h1>

          {/* Subheadline */}
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[#6B625B] font-body mb-10 leading-relaxed">
            从海量日志中挖掘价值，在复杂系统里精准排障。
            <br />
            实时监控、智能分析、可视化决策，让运维更简单，让系统更可靠。
          </p>

          {/* CTA Button */}
          <div className="mt-12 flex justify-center">
            <div className="p-[1px] rounded-full bg-gradient-to-r from-white/20 to-transparent">
              <button
                onClick={handleStartAnalysis}
                className="bg-white hover:bg-white/90 text-black px-10 py-4 rounded-full font-headline font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)] flex items-center gap-2"
              >
                开始你的日志分析
                <span className="material-symbols-outlined text-xl">trending_flat</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
```

---

## 📦 Step 6：安装依赖

```bash
npm install @tailwindcss/forms @tailwindcss/container-queries
# 或
pnpm add @tailwindcss/forms @tailwindcss/container-queries
```

---

## 🖼️ Step 7：放置资源

1. 把图片文件移到 `public/images/`：
```
public/
└── images/
    └── 微信图片_20260325222542_206_8.jpg
```

2. 在 `next.config.js` 中添加（可选，用于图片优化）：
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
}
module.exports = nextConfig
```

---

## 🔧 Step 8：修改路由

在 `handleStartAnalysis` 函数中修改你实际的路由：
```typescript
router.push('/upload');  // 改成实际路径
router.push('/login');
```

---

## ⚡ 性能优化建议

1. **粒子数量**：生产环境改为 `count: 600-800`
2. **动态导入** Aurora（可选）：
```typescript
import dynamic from 'next/dynamic';
const AuroraBackground = dynamic(() => import('./components/AuroraBackground'), { 
  ssr: false 
});
```

3. **图片优化**：使用 Next.js `Image` 组件
```typescript
import Image from 'next/image';
import bgImage from '@/public/images/微信图片.jpg';

// 在 style 改成
<Image
  src={bgImage}
  alt="background"
  fill
  className="object-cover"
  priority
/>
```

---

这样就完整了！要不要我给某个部分更详细的说明？

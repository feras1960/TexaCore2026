import React, { ReactNode, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetMouseRef = useRef({ x: -1000, y: -1000 });
  const currentMouseRef = useRef({ x: -1000, y: -1000 });
  
  // تأثير العدسة المكبرة (المغناطيس) بفيزياء ناعمة جداً ومطابقة للأصل
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // المزامنة التامة مع الإحداثيات الفعلية للحاوية
    const setupCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    const SPACING = 16;       
    const RADIUS = 0.9;       
    const MAGNET_RADIUS = 250; // مدى التأثير الناعم
    const MAX_DISPLACEMENT = 12; // أقصى إزاحة لتكون مريحة للعين وليست مبالغ فيها

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

      // لتنعيم حركة الماوس بدلاً من القفز المباشر (تأثير Ease-out)
      currentMouseRef.current.x += (targetMouseRef.current.x - currentMouseRef.current.x) * 0.15;
      currentMouseRef.current.y += (targetMouseRef.current.y - currentMouseRef.current.y) * 0.15;

      const mx = currentMouseRef.current.x;
      const my = currentMouseRef.current.y;

      for (let x = 0; x <= width; x += SPACING) {
        for (let y = 0; y <= height; y += SPACING) {
          let dx = x - mx;
          let dy = y - my;
          let dist = Math.sqrt(dx * dx + dy * dy);
          
          let offsetX = 0;
          let offsetY = 0;
          let scale = 1;

          if (dist < MAGNET_RADIUS) {
            // منحنى سلس (Smoothstep) يجعل الإزاحة طبيعية وتبدأ وتتلاشى بنعومة فائقة
            const t = 1 - (dist / MAGNET_RADIUS);
            const force = t * t * (3 - 2 * t); 
            
            if (dist > 0.1) {
              // التنافر بعيداً عن المركز بشكل طفيف جداً
              offsetX = (dx / dist) * (force * MAX_DISPLACEMENT);
              offsetY = (dy / dist) * (force * MAX_DISPLACEMENT);
            }
            // زيادة تكبير لا تكاد تُلحظ ولكنها تعطي إحساس العدسة (10% فقط)
            scale = 1 + force * 0.15; 
          }

          ctx.beginPath();
          ctx.arc(x + offsetX, y + offsetY, RADIUS * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", setupCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const parent = canvasRef.current?.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      targetMouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleMouseLeave = () => {
    targetMouseRef.current = { x: -1000, y: -1000 };
  };

  return (
    <main
      className={cn(
        "relative flex flex-col h-[100vh] w-full items-center justify-center bg-black text-slate-950 overflow-hidden",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* 1. The Fluid Aurora Video (Exactly like Stitch) */}
      <div className="absolute bottom-0 left-0 w-full h-[70vh] pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-100 mix-blend-screen"
          style={{ objectPosition: 'center center' }}
        >
          <source src="https://storage.googleapis.com/gweb-gemini-cdn/gemini/uploads/89e9004d716a7803fc7c9aab18c985af783f5a36.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 2. The Dotted Interactive Canvas Overlay (Authentic Magnifier Effect) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
      >
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      {/* 3. Top Gradient Mask (to make top text readable, fades from black to transparent) */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none z-10" />

      {/* 4. Overlay radial glow on top of everything to blend the text nicely */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none z-20"
         style={{ background: 'radial-gradient(circle at center 30%, transparent 30%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Content wrapper */}
      <div className="relative z-50 flex flex-col items-center justify-center w-full h-full">
         {children}
      </div>
    </main>
  );
};

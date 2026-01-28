import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { scale } from "@/lib/animations";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <motion.div
      {...scale}
      className={cn(
        "rounded-xl p-5",
        "bg-white/30 dark:bg-white/10",
        "backdrop-blur-xl backdrop-saturate-150",
        "border border-white/40 dark:border-white/20",
        "shadow-lg shadow-black/5",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

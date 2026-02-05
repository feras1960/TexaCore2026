import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { slideUp, hoverLift } from "@/lib/animations";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  delay = 0,
  className,
}: StatsCardProps) {
  return (
    <motion.div
      {...slideUp}
      {...hoverLift}
      transition={{ ...slideUp.transition, delay }}
      className={cn(
        "rounded-xl border bg-card p-6",
        "shadow-soft-sm hover:shadow-soft-lg",
        "transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn(
          "p-2.5 rounded-lg",
          "bg-[#2d5a4c]/10 dark:bg-[#4a8a74]/20"
        )}>
          <Icon className="h-5 w-5 text-[#2d5a4c] dark:text-[#4a8a74]" />
        </div>
      </div>
      
      <div className="space-y-1">
        <motion.h3
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
          className="text-3xl font-bold tracking-tight"
        >
          {value}
        </motion.h3>
        {change && (
          <p className={cn(
            "text-sm font-medium",
            changeType === "positive" && "text-[#2d5a4c]",
            changeType === "negative" && "text-red-500",
            changeType === "neutral" && "text-muted-foreground"
          )}>
            {change}
          </p>
        )}
      </div>
    </motion.div>
  );
}

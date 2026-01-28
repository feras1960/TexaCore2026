import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { slideUp, hoverLift } from "@/lib/animations";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export function AnimatedCard({ children, className, delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      {...slideUp}
      {...(hover ? hoverLift : {})}
      transition={{ ...slideUp.transition, delay }}
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

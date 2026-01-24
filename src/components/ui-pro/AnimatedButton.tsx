import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonTap } from "@/lib/animations";
import { Loader2 } from "lucide-react";

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function AnimatedButton({
  children,
  onClick,
  loading,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
}: AnimatedButtonProps) {
  const variants = {
    primary: "bg-[#2d5a4c] text-white hover:bg-[#1e3d33] shadow-sm hover:shadow-md",
    secondary: "bg-[#f4f4f5] dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[#e9ecef] dark:hover:bg-gray-700",
    ghost: "hover:bg-[#f4f4f5] dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
    gradient: "bg-gradient-to-r from-[#0A2540] to-[#2d5a4c] text-white shadow-sm hover:shadow-md",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <motion.button
      {...buttonTap}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

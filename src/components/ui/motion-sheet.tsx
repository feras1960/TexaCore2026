/**
 * MotionSheet - شيت محسّن مع أنيميشن سلس باستخدام Framer Motion
 * يوفر تجربة مستخدم أفضل مع spring physics وحركات طبيعية
 */

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { motion, AnimatePresence, type Variants, type HTMLMotionProps } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Type helper to merge Radix and Motion props safely
type MotionDivProps = HTMLMotionProps<"div">

// ===== Animation Variants =====

const overlayVariants: Variants = {
  hidden: { 
    opacity: 0,
    backdropFilter: 'blur(0px)',
  },
  visible: { 
    opacity: 1,
    backdropFilter: 'blur(8px)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    }
  },
  exit: { 
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    }
  }
}

const getContentVariants = (side: 'left' | 'right' | 'top' | 'bottom'): Variants => {
  // Use percentage-based sliding for proper RTL support
  const slideDirection = {
    left: { x: '-100%' },
    right: { x: '100%' },
    top: { y: '-100%' },
    bottom: { y: '100%' },
  }

  return {
    hidden: { 
      ...slideDirection[side],
      opacity: 0.9,
    },
    visible: { 
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 28,
        stiffness: 300,
        mass: 0.8,
      }
    },
    exit: { 
      ...slideDirection[side],
      opacity: 0.5,
      transition: {
        type: 'spring',
        damping: 32,
        stiffness: 400,
        mass: 0.6,
      }
    }
  }
}

// ===== Sheet Root =====

interface MotionSheetProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root> {
  modal?: boolean
}

const MotionSheet = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Root>,
  MotionSheetProps
>(({ modal = false, ...props }, _ref) => (
  <SheetPrimitive.Root modal={modal} {...props} />
))
MotionSheet.displayName = "MotionSheet"

const MotionSheetTrigger = SheetPrimitive.Trigger
const MotionSheetClose = SheetPrimitive.Close
const MotionSheetPortal = SheetPrimitive.Portal

// ===== Motion Overlay =====

interface MotionSheetOverlayProps extends MotionDivProps {
  isOpen?: boolean
}

const MotionSheetOverlay = React.forwardRef<
  HTMLDivElement,
  MotionSheetOverlayProps
>(({ className, isOpen, ...props }, ref) => (
  <AnimatePresence>
    {isOpen && (
      <SheetPrimitive.Overlay asChild forceMount>
        <motion.div
          ref={ref}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed inset-0 z-50 bg-black/20 pointer-events-none",
            className
          )}
          {...props}
        />
      </SheetPrimitive.Overlay>
    )}
  </AnimatePresence>
))
MotionSheetOverlay.displayName = "MotionSheetOverlay"

// ===== Sheet Variants =====

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background shadow-2xl",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b",
        bottom: "inset-x-0 bottom-0 border-t",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

// ===== Motion Content =====

interface MotionSheetContentProps
  extends VariantProps<typeof sheetVariants> {
  isOpen?: boolean
  overlayClassName?: string
  preventCloseOnOutsideClick?: boolean
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  /** Custom spring configuration */
  springConfig?: {
    damping?: number
    stiffness?: number
    mass?: number
  }
}

const MotionSheetContent = React.forwardRef<
  HTMLDivElement,
  MotionSheetContentProps
>(({ 
  side = "right", 
  className, 
  children, 
  isOpen,
  overlayClassName, 
  preventCloseOnOutsideClick,
  springConfig,
  style,
}, ref) => {
  const contentVariants = React.useMemo(() => {
    const variants = getContentVariants(side || 'right')
    
    // Apply custom spring config if provided
    if (springConfig) {
      variants.visible = {
        ...variants.visible,
        transition: {
          type: 'spring',
          damping: springConfig.damping ?? 28,
          stiffness: springConfig.stiffness ?? 300,
          mass: springConfig.mass ?? 0.8,
        }
      }
    }
    
    return variants
  }, [side, springConfig])

  // Prevent dismiss (closing) when clicking NexaPro Agent
  const handleInteractOutside = React.useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    if (target?.closest?.('#nexa-copilot-root')) {
      e.preventDefault();
      return;
    }
    if (preventCloseOnOutsideClick) e.preventDefault();
  }, [preventCloseOnOutsideClick]);

  return (
    <MotionSheetPortal>
      {/* Animated Overlay */}
      {!preventCloseOnOutsideClick && (
        <AnimatePresence>
          {isOpen && (
            <SheetPrimitive.Overlay asChild forceMount>
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  "fixed inset-0 z-50 bg-black/20 pointer-events-none",
                  overlayClassName
                )}
              />
            </SheetPrimitive.Overlay>
          )}
        </AnimatePresence>
      )}
      
      {/* Animated Content */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <SheetPrimitive.Content asChild forceMount
            onInteractOutside={handleInteractOutside}
            onEscapeKeyDown={preventCloseOnOutsideClick ? (e) => e.preventDefault() : undefined}
          >
            <motion.div
              ref={ref}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(sheetVariants({ side }), className)}
              style={style}
            >
              {children}
            </motion.div>
          </SheetPrimitive.Content>
        )}
      </AnimatePresence>
    </MotionSheetPortal>
  )
})
MotionSheetContent.displayName = "MotionSheetContent"

// ===== Static Components =====

const MotionSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-start",
      className
    )}
    {...props}
  />
)
MotionSheetHeader.displayName = "MotionSheetHeader"

const MotionSheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
MotionSheetFooter.displayName = "MotionSheetFooter"

const MotionSheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
MotionSheetTitle.displayName = "MotionSheetTitle"

const MotionSheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MotionSheetDescription.displayName = "MotionSheetDescription"

// ===== Presets =====

/** Preset spring configurations */
export const SPRING_PRESETS = {
  /** Smooth and elegant - default */
  smooth: { damping: 28, stiffness: 300, mass: 0.8 },
  /** Quick and snappy */
  snappy: { damping: 35, stiffness: 500, mass: 0.5 },
  /** Soft and bouncy */
  bouncy: { damping: 20, stiffness: 200, mass: 1 },
  /** Professional - minimal bounce */
  professional: { damping: 40, stiffness: 400, mass: 0.6 },
  /** Swiss minimalist */
  swiss: { damping: 32, stiffness: 350, mass: 0.7 },
} as const

export {
  MotionSheet,
  MotionSheetPortal,
  MotionSheetOverlay,
  MotionSheetTrigger,
  MotionSheetClose,
  MotionSheetContent,
  MotionSheetHeader,
  MotionSheetFooter,
  MotionSheetTitle,
  MotionSheetDescription,
}

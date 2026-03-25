import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/app/providers/LanguageProvider';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
  animated?: boolean;
}

export default function Logo({ 
  size = 'md', 
  showText = true, 
  className,
  variant = 'dark',
  animated = true
}: LogoProps) {
  const { t } = useLanguage();
  // Use React's useId for stable, unique IDs across renders
  const uniqueId = useId();
  
  const sizes = {
    sm: { iconSize: 36, textSize: 'text-base', subTextSize: 'text-[9px]' },
    md: { iconSize: 48, textSize: 'text-xl', subTextSize: 'text-[10px]' },
    lg: { iconSize: 64, textSize: 'text-3xl', subTextSize: 'text-sm' },
    xl: { iconSize: 80, textSize: 'text-4xl', subTextSize: 'text-base' },
  };

  const { iconSize, textSize, subTextSize } = sizes[size];
  
  // Unique gradient IDs to avoid conflicts - using stable useId
  const hexGradientId = `hexGradient-${variant}-${size}-${uniqueId}`;
  const threadGradientId = `threadGradient-${variant}-${size}-${uniqueId}`;

  // Get slogan from translations
  const slogan = t('app.brand.slogan');

  return (
    <motion.div 
      className={cn("flex items-center gap-3", className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Logo Icon - TexaCore Hexagon Design */}
      <div className="relative group">
        <svg 
          width={iconSize} 
          height={iconSize} 
          viewBox="0 0 44 44" 
          className={cn(
            "drop-shadow-lg transition-all",
            animated && "group-hover:drop-shadow-xl group-hover:scale-105"
          )}
          style={{ background: 'transparent' }}
        >
          <defs>
            <linearGradient id={hexGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
            <linearGradient id={threadGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          
          {/* Hexagon Shape with subtle shadow */}
          <polygon 
            points="22,3 39,12 39,32 22,41 5,32 5,12" 
            fill="rgba(0,0,0,0.1)"
            transform="translate(1, 1)"
          />
          <polygon 
            points="22,2 40,12 40,32 22,42 4,32 4,12" 
            fill={`url(#${hexGradientId})`}
            className={cn(
              "transition-all duration-300",
              animated && "group-hover:filter group-hover:brightness-110"
            )}
          >
            {animated && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 22 22"
                to="360 22 22"
                dur="20s"
                repeatCount="indefinite"
              />
            )}
          </polygon>
          
          {/* Hexagon inner highlight */}
          <polygon 
            points="22,6 36,14 36,30 22,38 8,30 8,14" 
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
          
          {/* Thread/Fabric Wave */}
          <path 
            d="M10,22 Q15,12 22,22 T34,22" 
            stroke={`url(#${threadGradientId})`}
            strokeWidth="4.5" 
            fill="none" 
            strokeLinecap="round"
            className="transition-all duration-300"
          >
            {animated && (
              <animate
                attributeName="d"
                values="M10,22 Q15,12 22,22 T34,22;M10,22 Q15,32 22,22 T34,22;M10,22 Q15,12 22,22 T34,22"
                dur="3s"
                repeatCount="indefinite"
              />
            )}
          </path>
          
          {/* Second thread layer for depth */}
          <path 
            d="M14,22 Q18,16 22,22 T30,22" 
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round"
          />
          
          {/* Core Circle with inner detail */}
          <circle cx="22" cy="22" r="5.5" fill="white" opacity="0.95">
            {animated && (
              <animate
                attributeName="r"
                values="5.5;6.5;5.5"
                dur="2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* Inner core detail */}
          <circle cx="22" cy="22" r="2.5" fill="#047857" opacity="0.6" />
        </svg>
        
        {/* Glow Effect on Hover */}
        {animated && (
          <div className="absolute -inset-1 bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>
      
      {/* Logo Text - TexaCore */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline" dir="ltr">
            {/* eslint-disable-next-line i18next/no-literal-string -- Brand name */}
            <span 
              className={cn(
                textSize,
                variant === 'light' ? 'text-white' : 'text-emerald-700',
                "transition-colors duration-300"
              )}
              style={{ 
                fontWeight: 900, 
                letterSpacing: '-0.03em',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Texa
            </span>
            {/* eslint-disable-next-line i18next/no-literal-string -- Brand name */}
            <span 
              className={cn(
                textSize,
                "text-amber-500 transition-colors duration-300"
              )}
              style={{ 
                fontWeight: 900, 
                letterSpacing: '-0.03em',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              Core
            </span>
          </div>
          <span 
            className={cn(
              subTextSize,
              variant === 'light' ? 'text-white/70' : 'text-gray-500',
              "transition-colors duration-300"
            )}
            style={{ fontWeight: 500 }}
          >
            {slogan}
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Icon-only version
export const LogoIcon: React.FC<{ 
  variant?: 'dark' | 'light'; 
  size?: number;
  className?: string;
  animated?: boolean;
}> = ({
  variant = 'dark',
  size = 44,
  className = '',
  animated = true,
}) => {
  const uniqueId = useId();
  const hexGradientId = `hexGradient-icon-${variant}-${uniqueId}`;
  const threadGradientId = `threadGradient-icon-${variant}-${uniqueId}`;

  return (
    <div className={cn("relative group", className)}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 44 44" 
        className={cn(
          "drop-shadow-lg transition-all",
          animated && "group-hover:drop-shadow-xl group-hover:scale-105"
        )}
        style={{ background: 'transparent' }}
      >
        <defs>
          <linearGradient id={hexGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id={threadGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        
        {/* Hexagon Shape */}
        <polygon 
          points="22,2 40,12 40,32 22,42 4,32 4,12" 
          fill={`url(#${hexGradientId})`}
          className={cn(
            "transition-all duration-300",
            animated && "group-hover:filter group-hover:brightness-110"
          )}
        >
          {animated && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 22 22"
              to="360 22 22"
              dur="20s"
              repeatCount="indefinite"
            />
          )}
        </polygon>
        
        {/* Thread/Fabric Wave */}
        <path 
          d="M12,22 Q17,14 22,22 T32,22" 
          stroke={`url(#${threadGradientId})`}
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round"
        >
          {animated && (
            <animate
              attributeName="d"
              values="M12,22 Q17,14 22,22 T32,22;M12,22 Q17,30 22,22 T32,22;M12,22 Q17,14 22,22 T32,22"
              dur="3s"
              repeatCount="indefinite"
            />
          )}
        </path>
        
        {/* Core Dot */}
        <circle cx="22" cy="22" r="4" fill="white" opacity="0.95">
          {animated && (
            <animate
              attributeName="r"
              values="4;5;4"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </svg>
      
      {/* Glow Effect on Hover */}
      {animated && (
        <div className="absolute -inset-1 bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  );
};

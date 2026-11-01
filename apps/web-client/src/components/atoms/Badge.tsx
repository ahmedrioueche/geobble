import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'sm', 
  className = '' 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-black rounded-full uppercase tracking-widest leading-none";
  
  const variants = {
    default: "bg-slate-800 text-slate-300 border border-slate-700",
    success: "bg-[var(--color-correct)] text-white shadow-lg shadow-green-500/20",
    error: "bg-[var(--color-wrong)] text-white shadow-lg shadow-red-500/20",
    warning: "bg-[var(--color-streak)] text-[var(--color-bg-primary)] shadow-lg shadow-amber-500/20",
    info: "bg-[var(--color-accent)] text-[var(--color-bg-primary)] shadow-lg shadow-sky-500/20"
  };

  const sizes = {
    xs: "px-2 py-0.5 text-[8px]",
    sm: "px-3 py-1 text-[10px]",
    md: "px-4 py-1.5 text-xs"
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

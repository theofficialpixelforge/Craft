import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid' | 'outline';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'ghost', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer select-none',
        size === 'sm' && 'px-2 py-1 text-xs',
        size === 'md' && 'px-3 py-1.5 text-sm',
        variant === 'ghost' && 'hover:bg-[var(--bg-block-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        variant === 'solid' && 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
        variant === 'outline' && 'border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-block-hover)]',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

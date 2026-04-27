import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'icon';
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  const variantClass = {
    default: 'bg-neutral-950 text-white hover:bg-neutral-800',
    outline: 'border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100',
    secondary: 'bg-white text-neutral-950 hover:bg-neutral-200',
  }[variant];
  const sizeClass = size === 'icon' ? 'h-9 w-9 p-0' : 'px-4 py-2';
  return <button className={cn('inline-flex items-center justify-center font-medium transition disabled:opacity-50', variantClass, sizeClass, className)} {...props} />;
}

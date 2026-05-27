import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { actionBaseClassName, actionVariantClassNames, type ActionVariant } from './actionStyles';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  children: ReactNode;
}

export function ActionButton({ variant = 'secondary', className = '', children, ...props }: ActionButtonProps) {
  return (
    <button className={`${actionBaseClassName} ${actionVariantClassNames[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

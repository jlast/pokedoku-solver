import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { actionBaseClassName, actionVariantClassNames, type ActionVariant } from './actionStyles';

interface ActionLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ActionVariant;
  children: ReactNode;
}

export function ActionLink({ variant = 'secondary', className = '', children, ...props }: ActionLinkProps) {
  return (
    <a className={`${actionBaseClassName} ${actionVariantClassNames[variant]} ${className}`.trim()} {...props}>
      {children}
    </a>
  );
}

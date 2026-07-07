import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: Props) {
  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
      {children}
    </div>
  );
}

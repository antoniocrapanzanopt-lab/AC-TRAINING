import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-xl p-5 shadow-lg ${className}`}>
      {title && <h3 className="text-lg font-bold text-white mb-4">{title}</h3>}
      {children}
    </div>
  );
};

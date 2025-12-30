import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className, title }: CardProps) {
    return (
        <div className={twMerge("glass-panel p-6 shadow-xl", className)}>
            {title && (
                <h3 className="text-xl font-bold mb-4 text-emerald-400 border-b border-slate-700 pb-2">
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    isActive?: boolean;
}

const SidebarItem = ({ icon: Icon, label, href, isActive }: SidebarItemProps) => {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 group text-sm font-medium",
                isActive
                    ? "bg-pink-500 text-white shadow-md shadow-pink-200"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            )}
        >
            <Icon size={20} className={cn("transition-colors", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600")} />
            <span>{label}</span>
        </Link>
    );
};

export default SidebarItem;

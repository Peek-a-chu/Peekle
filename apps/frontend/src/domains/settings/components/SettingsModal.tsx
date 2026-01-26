'use client';

import { X, Palette, Monitor } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import ThemeSection from './ThemeSection';
import DeviceSection from './DeviceSection';
import { cn } from '@/lib/utils';

const SettingsModal = () => {
    const { isOpen, closeModal, activeTab, setActiveTab } = useSettingsStore();

    const tabs = [
        { id: 'theme', label: '테마 설정', icon: Palette },
        { id: 'device', label: '장치 관리', icon: Monitor },
    ] as const;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogOverlay className="bg-black/40 backdrop-blur-sm z-[100]" />
            <DialogContent
                className="max-w-2xl w-[95vw] sm:w-[90vw] p-0 overflow-hidden border border-border shadow-2xl z-[101] bg-card rounded-2xl animate-in zoom-in-95 duration-200"
            >
                <div className="flex flex-col sm:flex-row h-[600px] sm:h-[550px]">
                    {/* 좌측 사이드바 (내비게이션) */}
                    <aside className="w-full sm:w-64 bg-muted border-b sm:border-b-0 sm:border-r border-border p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 shrink-0">
                        <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight px-2 sm:px-0">설정</h2>

                        <nav className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-x-visible no-scrollbar pb-2 sm:pb-0 px-2 sm:px-0">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 border border-transparent',
                                            isActive
                                                ? 'bg-primary/15 text-primary border-primary/20 shadow-sm'
                                                : 'text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground'
                                        )}
                                    >
                                        <Icon size={18} className={cn(isActive ? 'opacity-100' : 'opacity-50')} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="hidden sm:block mt-auto pt-4 border-t border-border/50">
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-40">
                                System Version 1.0.0
                            </p>
                        </div>
                    </aside>

                    {/* 우측 컨텐츠 영역 */}
                    <main className="flex-1 p-4 sm:p-8 relative flex flex-col min-w-0 bg-card overflow-hidden">
                        {/* 활성 탭 컨텐츠 */}
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            {activeTab === 'theme' ? <ThemeSection /> : <DeviceSection />}
                        </div>
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsModal;

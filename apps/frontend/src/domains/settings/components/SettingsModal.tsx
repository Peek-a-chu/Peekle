'use client';

import { Palette, Monitor, X } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogClose } from '@/components/ui/dialog';
import ThemeSection from './ThemeSection';
import DeviceSection from './DeviceSection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SettingsModal = () => {
  const { isOpen, closeModal, activeTab, setActiveTab } = useSettingsStore();

  const tabs = [
    { id: 'theme', label: '테마 설정', icon: Palette },
    { id: 'device', label: '게임 설정', icon: Monitor }, // Changed label to "게임 설정" as per context
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogOverlay className="bg-black/60 backdrop-blur-[2px] z-[100]" />
      <DialogContent className="max-w-[840px] w-[92vw] max-h-[80vh] p-0 gap-0 overflow-hidden border border-border shadow-2xl z-[101] bg-card rounded-[20px] animate-in zoom-in-95 duration-200 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0 bg-card/50 backdrop-blur-sm z-10">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-3">
            설정
            <span className="text-xs font-normal text-muted-foreground border-l border-border pl-3 h-4 flex items-center">
              환경 설정을 변경합니다
            </span>
          </DialogTitle>

          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={closeModal}>
              <X size={18} className="text-muted-foreground" />
            </Button>
          </DialogClose>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  )}
                >
                  <Icon size={16} strokeWidth={2.5} className={cn(isActive ? 'text-primary' : 'opacity-70')} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-card/50">
          <div className="max-w-3xl mx-auto p-5">
            {activeTab === 'theme' ? <ThemeSection /> : <DeviceSection />}
          </div>
        </main>

      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;

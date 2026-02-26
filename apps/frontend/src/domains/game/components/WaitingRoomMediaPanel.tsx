'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Lock,
    ChevronDown,
    ChevronUp,
    Settings,
    MonitorSmartphone,
    Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WaitingRoomMediaPanelProps {
    localStream: MediaStream | null;
}

interface DeviceInfo {
    deviceId: string;
    label: string;
}

export function WaitingRoomMediaPanel({
    localStream,
}: WaitingRoomMediaPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [audioInputDevices, setAudioInputDevices] = useState<DeviceInfo[]>([]);
    const [videoInputDevices, setVideoInputDevices] = useState<DeviceInfo[]>([]);
    // Removed local isMirrored state

    // Settings Store for Selection & Mirror
    const {
        selectedCameraId,
        selectedMicId,
        setCamera,
        setMic,
        isMicOn,
        isCamOn,
        toggleMic,
        toggleCam
    } = useSettingsStore();

    const videoRef = useRef<HTMLVideoElement>(null);

    // Load Devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permissions first to get labels
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

                const devices = await navigator.mediaDevices.enumerateDevices();

                const audioInputs = devices
                    .filter((device) => device.kind === 'audioinput')
                    .map((d) => ({
                        deviceId: d.deviceId,
                        label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`,
                    }));

                const videoInputs = devices
                    .filter((device) => device.kind === 'videoinput')
                    .map((d) => ({
                        deviceId: d.deviceId,
                        label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`,
                    }));

                setAudioInputDevices(audioInputs);
                setVideoInputDevices(videoInputs);
            } catch (error) {
                console.error('Error fetching devices:', error);
                toast.error('장치 목록을 불러올 수 없습니다.');
            }
        };

        if (isOpen) {
            void getDevices();
        }
    }, [isOpen]);

    // Collapsed View (Summary)
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50 dark:border-white/10 dark:bg-[#0F1624] dark:hover:bg-[#151b2b]"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Settings className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                        <h3 className="text-sm font-medium text-foreground dark:text-[#E8EEF9]">
                            내 미디어 설정
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn('flex items-center gap-1', isCamOn ? 'text-green-500' : '')}>
                                {isCamOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                                {isCamOn ? '카메라 켜짐' : '카메라 꺼짐'}
                            </span>
                            <span className="text-border">|</span>
                            <span className={cn('flex items-center gap-1', isMicOn ? 'text-green-500' : '')}>
                                {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                                {isMicOn ? '마이크 켜짐' : '마이크 꺼짐'}
                            </span>
                        </div>
                    </div>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </button>
        );
    }

    // Expanded View
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 ring-1 ring-primary/5 dark:border-white/10 dark:bg-[#0F1624]">
            {/* Header (Expand/Collapse) */}
            <button
                onClick={() => setIsOpen(false)}
                className="mb-2 flex w-full items-center justify-between"
            >
                <h3 className="text-sm font-medium text-foreground dark:text-[#E8EEF9]">
                    내 미디어 설정
                </h3>
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className="flex gap-4 flex-row">
                {/* Left: Video Preview (Fixed Width) */}
                <div className="flex flex-col gap-2">
                    <div className="relative aspect-video shrink-0 overflow-hidden rounded-lg bg-black/90 shadow-sm ring-1 ring-border dark:ring-white/10 w-[260px]">
                        {isCamOn && localStream ? (
                            <video
                                ref={(node) => {
                                    if (node && localStream) node.srcObject = localStream;
                                }}
                                autoPlay
                                muted
                                playsInline
                                className={cn(
                                    "h-full w-full object-cover transition-transform duration-300"
                                )}
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/50">
                                <VideoOff className="mb-2 h-8 w-8 opacity-50" />
                                <span className="text-xs font-medium">카메라 꺼짐</span>
                            </div>
                        )}

                        {/* Badge: Me Only */}
                        <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                            <Lock className="h-2.5 w-2.5" />
                            <span>나만 보임</span>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-muted-foreground">
                        카메라 미리보기
                    </p>
                </div>

                {/* Right: Controls (Variable Width) */}
                <div className="flex flex-1 flex-col gap-4">

                    {/* 1. Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant={isMicOn ? 'secondary' : 'outline'}
                            size="sm"
                            className={cn(
                                "h-9 justify-center gap-2 border transition-all",
                                isMicOn
                                    ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700"
                                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/30"
                            )}
                            onClick={toggleMic}
                        >
                            {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                            <span className="text-xs">{isMicOn ? '켜짐' : '꺼짐'}</span>
                        </Button>

                        <Button
                            variant={isCamOn ? 'outline' : 'outline'}
                            size="sm"
                            className={cn(
                                "h-9 justify-center gap-2 border transition-all",
                                isCamOn
                                    ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border-zinc-700"
                                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/30"
                            )}
                            onClick={toggleCam}
                        >
                            {isCamOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                            <span className="text-xs">{isCamOn ? '켜짐' : '꺼짐'}</span>
                        </Button>
                    </div>

                    {/* 2. Device Selection */}
                    <div className="grid gap-2 grid-cols-2">
                        <Select value={selectedMicId} onValueChange={setMic} disabled={!isMicOn}>
                            <SelectTrigger className="h-8 text-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Mic className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="마이크 선택" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {audioInputDevices.map((device) => (
                                    <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                                        {device.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedCameraId} onValueChange={setCamera} disabled={!isCamOn}>
                            <SelectTrigger className="h-8 text-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="카메라 선택" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {videoInputDevices.map((device) => (
                                    <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs">
                                        {device.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3. Test & Utilities */}
                    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/30 p-2">
                        {/* Mic Meter (Visual) */}
                        <div className="flex flex-1 items-center gap-2">
                            <Volume2 className={cn("h-3.5 w-3.5", isMicOn ? "text-primary" : "text-muted-foreground")} />
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-100",
                                        isMicOn ? "w-2/3 bg-green-500 animate-pulse" : "w-0 bg-transparent"
                                    )}
                                />
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}

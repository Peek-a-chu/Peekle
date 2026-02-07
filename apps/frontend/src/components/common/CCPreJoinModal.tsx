'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
  Volume2,
  Play,
  Square,
  ChevronDown,
  Check,
  AlertCircle,
  Puzzle,
  Loader2,
  Link as LinkIcon,
  Download,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExtensionCheck } from '@/hooks/useExtensionCheck';
import { useExtensionVersionCheck } from '@/hooks/useExtensionVersionCheck';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/domains/settings/hooks/useSettingsStore';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { UserIcon } from '@/components/UserIcon';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmModal, ActionModal } from '@/components/common/Modal';

interface CCPreJoinModalProps {
  roomTitle: string;
  description?: string;
  onJoin: (micEnabled: boolean, camEnabled: boolean) => void;
  onCancel?: () => void;
  joinLabel?: string;
  isLoading?: boolean;
}

export const CCPreJoinModal = ({
  roomTitle,
  description,
  onJoin,
  onCancel,
  joinLabel,
  isLoading = false,
}: CCPreJoinModalProps) => {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const isBojLinked = !!user?.bojId;

  // Extension Check State
  const { isInstalled, extensionVersion, extensionToken, isChecking, checkInstallation } = useExtensionCheck();

  // Version Check from R2
  const { versionInfo, isLoading: isVersionLoading } = useExtensionVersionCheck();
  const REQUIRED_VERSION = versionInfo?.latestVersion || '0.0.8';
  const DOWNLOAD_URL = versionInfo?.downloadUrl || 'https://pub-09a6ac9bff27427fabb6a07fc05033c0.r2.dev/extension/peekle-extension.zip';

  type ExtensionStatus = 'NOT_INSTALLED' | 'INSTALLED' | 'LINKED' | 'MISMATCH' | 'LOADING' | 'VERSION_MISMATCH';
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>('LOADING');
  const [isLinking, setIsLinking] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Polling State for Installation Check
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Stop polling if status changes to INSTALLED or LINKED
  useEffect(() => {
    if ((extensionStatus === 'INSTALLED' || extensionStatus === 'LINKED') && isPolling) {
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [extensionStatus, isPolling]);

  const handleInstallClick = () => {
    // Only open window if not just retrying (optional, but keep simple: always open or check)
    // User asked: "5초후엔 설치링크/다시체크하기 버튼이 나오게" -> Implications usually means "Retry"
    // Let's open the window only if it's the "First" time or just let it open again.
    // Actually, if I click "Install", it opens window. If I come back and it's not detected, I click again.
    // Maybe I should separate "Check" from "Install"?
    // For now, simplicity: Clicking button opens window AND starts polling.
    // [Temp] Manual installation guide instead of direct store link
    setShowManualModal(true);

    /* Original store link preserved
    window.open(
      'https://chromewebstore.google.com/detail/lgcgoodhgjalkdncpnhnjaffnnpmmcjn?utm_source=item-share-cb',
      '_blank',
    );
    */

    setIsPolling(true);
    checkInstallation(); // Immediate

    pollingRef.current = setInterval(() => {
      checkInstallation();
    }, 1000);

    setTimeout(() => {
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 5000);
  };

  // Check Extension Logic
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) return;

    if (isChecking) {
      setExtensionStatus('LOADING');
      return;
    }

    const checkTokenValidity = async (token: string) => {
      try {
        const res = await fetch(`/api/users/me/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, bojId: user.bojId }),
        });

        if (!res.ok) {
          throw new Error('API Error');
        }

        const json = await res.json();

        if (json.data?.valid) {
          // Check version if linked
          if (extensionVersion && extensionVersion !== REQUIRED_VERSION) {
            setExtensionStatus('VERSION_MISMATCH');
          } else {
            setExtensionStatus('LINKED');
          }
        } else {
          setExtensionStatus('MISMATCH');
        }
      } catch (e) {
        console.error('Token validation failed', e);
        setExtensionStatus('MISMATCH');
      }
    };

    if (extensionToken) {
      void checkTokenValidity(extensionToken);
    } else if (isInstalled) {
      // Even if not linked, check version if installed
      if (extensionVersion && extensionVersion !== REQUIRED_VERSION) {
        setExtensionStatus('VERSION_MISMATCH');
      } else {
        setExtensionStatus('INSTALLED'); // Installed but not linked
      }
    } else {
      setExtensionStatus('NOT_INSTALLED');
    }
  }, [user, isAuthLoading, isInstalled, extensionToken, extensionVersion, isChecking, REQUIRED_VERSION]);

  const handleLinkAccount = async () => {
    setIsLinking(true);
    try {
      const res = await fetch('/api/users/me/extension-token', {
        method: 'POST',
        body: JSON.stringify({ regenerate: false }),
      });
      const json = await res.json();
      const newToken = json.data?.extensionToken;

      if (newToken) {
        window.postMessage(
          {
            type: 'PEEKLE_SET_TOKEN',
            token: newToken,
            user: user,
          },
          '*',
        );
        toast.success('계정이 연동되었습니다!');
        checkInstallation(); // Re-check
      } else {
        toast.error('토큰 발급 실패');
      }
    } catch (e) {
      toast.error('연동 중 오류가 발생했습니다.');
    } finally {
      setIsLinking(false);
    }
  };

  // Settings Store
  const {
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    micVolume,
    speakerVolume,
    setCamera,
    setMic,
    setSpeaker,
    setMicVolume,
    setSpeakerVolume,
  } = useSettingsStore();

  // Local State
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeakerTestRunning, setIsSpeakerTestRunning] = useState(false);
  const [isMicTestRunning, setIsMicTestRunning] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const speakerOscillatorsRef = useRef<OscillatorNode[]>([]);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const inputGainNodeRef = useRef<GainNode | null>(null);

  // Device Lists
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  // ---------------------------------------------------------------------------
  // 1. Device Enumeration
  // ---------------------------------------------------------------------------
  const getDevices = useCallback(async () => {
    try {
      // First ensure permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop()); // Just to request permission

      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
    } catch (error) {
      console.warn('Device enumeration failed', error);
    }
  }, []);

  useEffect(() => {
    void getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [getDevices]);

  // ---------------------------------------------------------------------------
  // 2. Camera Preview Logic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const startPreview = async () => {
      // Cleanup previous video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!isCamOn) {
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.warn('Camera preview failed', e);
        setIsCamOn(false);
        toast.error('카메라를 시작할 수 없습니다.');
      }
    };

    void startPreview();
  }, [isCamOn, selectedCameraId]);

  // ---------------------------------------------------------------------------
  // 3. Mic Test & Metering Logic (Controlled by isMicOn + Test Button)
  // ---------------------------------------------------------------------------

  // Cleanup helper
  const stopMetering = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (meterStreamRef.current) {
      meterStreamRef.current.getTracks().forEach((t) => t.stop());
      meterStreamRef.current = null;
    }
    setMicLevel(0);

    // Also stop loopback if running
    if (micTestAudioRef.current) {
      micTestAudioRef.current.pause();
      micTestAudioRef.current = null;
    }
    if (inputGainNodeRef.current) {
      try {
        inputGainNodeRef.current.disconnect();
      } catch { }
      inputGainNodeRef.current = null;
    }
  }, []);

  // Monitor Mic State
  useEffect(() => {
    // If Mic is OFF, force stop test and metering
    if (!isMicOn) {
      if (isMicTestRunning) setIsMicTestRunning(false);
      stopMetering();
    }
  }, [isMicOn, stopMetering, isMicTestRunning]);

  const handleMicTestToggle = async () => {
    if (!isMicOn) {
      toast.error('마이크를 켜야 테스트할 수 있습니다.');
      return;
    }

    if (isMicTestRunning) {
      // Stop Loopback & Metering
      stopMetering();
      setIsMicTestRunning(false);
      return;
    }

    // Start Loopback + Metering
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined,
          echoCancellation: true, // Try to prevent squeal
          noiseSuppression: true,
        },
      });
      meterStreamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // 1. Setup Analyzer (Visualizer)
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;

      // 2. Setup Loopback (Hear yourself) - CAUTION: Feedback loop if speakers loud
      const inputGain = ctx.createGain();
      inputGain.gain.value = micVolume / 100; // Apply volume
      inputGainNodeRef.current = inputGain;

      source.connect(analyser); // For Visuals
      source.connect(inputGain); // For Audio Path
      inputGain.connect(ctx.destination); // To Speakers

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      const update = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);

        const array = dataArrayRef.current;
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
          sum += array[i];
        }
        const average = sum / array.length;
        const level = Math.min(100, Math.max(0, average * 2.5));
        setMicLevel(level);

        rafIdRef.current = requestAnimationFrame(update);
      };
      update();

      setIsMicTestRunning(true);
    } catch (e) {
      console.warn('Mic test failed', e);
      toast.error('마이크 테스트 실패');
      setIsMicTestRunning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Speaker Test Logic
  // ---------------------------------------------------------------------------
  const handleSpeakerTest = async () => {
    if (isSpeakerTestRunning) {
      // Stop
      speakerOscillatorsRef.current.forEach((o) => o.stop());
      speakerOscillatorsRef.current = [];
      setIsSpeakerTestRunning(false);
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (selectedSpeakerId && selectedSpeakerId !== 'default' && (ctx as any).setSinkId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (ctx as any).setSinkId(selectedSpeakerId);
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 440; // A4

      gain.gain.value = speakerVolume / 100;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      speakerOscillatorsRef.current.push(osc);
      setIsSpeakerTestRunning(true);

      setTimeout(() => {
        osc.stop();
        setIsSpeakerTestRunning((prev) => {
          if (prev) {
            speakerOscillatorsRef.current = [];
            return false;
          }
          return false;
        });
      }, 2000);
    } catch (e) {
      console.warn('Speaker test failed', e);
      toast.error('스피커 테스트 실패');
      setIsSpeakerTestRunning(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Cleanup on Unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      // Stop streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopMetering(); // Use the cleanup helper for mic-related streams/meters
      // Stop animations
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      // Close AudioContext (optional, but good practice)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
    };
  }, [stopMetering]);

  const handleJoinClick = () => {
    onJoin(isMicOn, isCamOn);
  };

  return (
    <TooltipProvider>
      {/* 1. Darker overlay for better modal elevation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        {/* Modal Card - Brighter surface for contrast */}
        <div className="w-[960px] max-w-[95vw] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header - Clear title hierarchy */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50 bg-zinc-900/50">
            <div className="flex flex-col">
              {/* Title: Brightest text */}
              <h2 className="text-lg font-semibold text-zinc-100">{roomTitle}</h2>
              {/* Helper: Dimmer text */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{description || '멤버들과 함께 진행해 보세요'}</span>
              </div>
            </div>
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full"
              >
                <X size={20} />
              </Button>
            )}
          </div>

          {/* Body Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] min-h-0">
            {/* Left: Video Preview - Keep dark for video */}
            <div className="relative bg-black flex items-center justify-center p-6 lg:border-r border-zinc-700/50">
              <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-lg border border-zinc-700/60 ring-1 ring-white/5">
                {isCamOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                    {user ? (
                      <UserIcon user={user} className="w-24 h-24 mb-4" />
                    ) : (
                      <div className="w-24 h-24 bg-zinc-700 rounded-full mb-4" />
                    )}
                    <p className="text-zinc-500 text-sm">카메라가 꺼져 있습니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Settings Panel */}
            <div className="flex flex-col p-6 gap-6 bg-zinc-900 overflow-y-auto no-scrollbar">
              {/* Camera Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {/* Label: Medium brightness */}
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Video size={14} className="text-zinc-500" /> 카메라
                  </label>
                </div>
                {/* 2. Brighter input surface + 3. Stronger border */}
                <Select value={selectedCameraId} onValueChange={setCamera}>
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-600 text-zinc-100 h-10 hover:border-zinc-500 focus:border-primary focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder="카메라 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.map((d) => (
                      <SelectItem key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Unknown Camera'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Section divider */}
              <div className="border-t border-zinc-700/30" />

              {/* Mic Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Mic size={14} className="text-zinc-500" /> 마이크
                  </label>
                  {!isMicOn && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <AlertCircle size={10} /> 테스트하려면 마이크를 켜주세요
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Select value={selectedMicId} onValueChange={setMic}>
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-600 text-zinc-100 h-10 flex-1 hover:border-zinc-500 focus:border-primary focus:ring-1 focus:ring-primary/20">
                      <SelectValue placeholder="마이크 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Unknown Mic'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleMicTestToggle}
                        disabled={!isMicOn}
                        className={cn(
                          'shrink-0 w-10 h-10 border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-200 transition-all',
                          isMicTestRunning && 'bg-primary/10 text-primary border-primary/50',
                          !isMicOn && 'bg-zinc-850 text-zinc-600 border-zinc-700',
                        )}
                      >
                        {isMicTestRunning ? (
                          <Square size={16} className="fill-current" />
                        ) : (
                          <Mic size={16} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    {!isMicOn && (
                      <TooltipContent side="top">
                        <p>마이크가 꺼져 있어 테스트할 수 없습니다</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>

                {/* Level Meter */}
                <div
                  className={cn('space-y-2 transition-opacity', !isMicOn && 'opacity-40 grayscale')}
                >
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>입력 레벨</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                    <div
                      className={cn(
                        'h-full transition-all duration-75 ease-out rounded-full',
                        micLevel > 5 ? 'bg-primary' : 'bg-transparent',
                      )}
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Section divider */}
              <div className="border-t border-zinc-700/30" />

              {/* Speaker Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Volume2 size={14} className="text-zinc-500" /> 스피커
                  </label>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedSpeakerId} onValueChange={setSpeaker}>
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-600 text-zinc-100 h-10 flex-1 hover:border-zinc-500 focus:border-primary focus:ring-1 focus:ring-primary/20">
                      <SelectValue placeholder="스피커 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioOutputDevices.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || 'Default Speaker'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleSpeakerTest}
                    className={cn(
                      'shrink-0 w-10 h-10 border-zinc-600 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 text-zinc-200',
                      isSpeakerTestRunning && 'bg-primary/10 text-primary border-primary/50',
                    )}
                    title="스피커 테스트"
                  >
                    {isSpeakerTestRunning ? (
                      <Square size={16} className="fill-current" />
                    ) : (
                      <Play size={16} className="fill-current" />
                    )}
                  </Button>
                </div>
                <div className="pt-1">
                  <Slider
                    value={[speakerVolume]}
                    onValueChange={([v]) => setSpeakerVolume(v)}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Main Controls */}
          <div className="px-6 py-5 bg-zinc-900 border-t border-zinc-700/50 flex items-center justify-between">
            {/* Left: Device Toggles - 6. Clear state differentiation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setIsMicOn(!isMicOn)}
                className={cn(
                  'h-11 px-5 rounded-lg transition-all flex gap-3 min-w-[140px] justify-start font-medium',
                  isMicOn
                    ? 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500'
                    : 'border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950/40',
                )}
              >
                <div
                  className={cn('p-1.5 rounded-full', isMicOn ? 'bg-zinc-700' : 'bg-red-500/20')}
                >
                  {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                </div>
                <span>{isMicOn ? '마이크 켜짐' : '마이크 꺼짐'}</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsCamOn(!isCamOn)}
                className={cn(
                  'h-11 px-5 rounded-lg transition-all flex gap-3 min-w-[140px] justify-start font-medium',
                  isCamOn
                    ? 'border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500'
                    : 'border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950/40',
                )}
              >
                <div
                  className={cn('p-1.5 rounded-full', isCamOn ? 'bg-zinc-700' : 'bg-red-500/20')}
                >
                  {isCamOn ? <Video size={18} /> : <VideoOff size={18} />}
                </div>
                <span>{isCamOn ? '카메라 켜짐' : '카메라 꺼짐'}</span>
              </Button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 relative">
              {/* Speech Bubble (말풍선) 안내 - Priority Fixed */}
              {extensionStatus === 'LOADING' ? null : (
                <>
                  {extensionStatus === 'NOT_INSTALLED' ? (
                    <div className="absolute bottom-full right-0 mb-4 animate-bounce-subtle">
                      <div className="bg-blue-600 text-white text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2">
                        <Puzzle size={14} />
                        확장 프로그램을 먼저 설치해 주세요!
                      </div>
                      <div className="w-3 h-3 bg-blue-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
                    </div>
                  ) : extensionStatus === 'VERSION_MISMATCH' ? (
                    <div className="absolute bottom-full right-0 mb-4 animate-bounce-subtle">
                      <div className="bg-red-600 text-white text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2">
                        <AlertCircle size={14} />
                        확장 프로그램 업데이트가 필요합니다! ({extensionVersion} → {REQUIRED_VERSION})
                      </div>
                      <div className="w-3 h-3 bg-red-600 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
                    </div>
                  ) : !isBojLinked ? (
                    <div className="absolute bottom-full right-0 mb-4 animate-bounce-subtle">
                      <div className="bg-primary text-primary-foreground text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2">
                        <AlertCircle size={14} />
                        프로필에서 백준 아이디를 먼저 등록해 주세요.
                      </div>
                      <div className="w-3 h-3 bg-primary rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
                    </div>
                  ) : (
                    (extensionStatus === 'INSTALLED' || extensionStatus === 'MISMATCH') && (
                      <div className="absolute bottom-full right-0 mb-4 animate-bounce-subtle">
                        <div className="bg-primary text-primary-foreground text-[13px] font-bold py-2.5 px-4 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2">
                          <LinkIcon size={14} />
                          확장 프로그램과 계정을 연동해 주세요.
                        </div>
                        <div className="w-3 h-3 bg-primary rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
                      </div>
                    )
                  )}
                </>
              )}

              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 h-11 px-6"
              >
                취소
              </Button>

              {/* Dynamic Action Button based on Extension Status */}
              {extensionStatus === 'LOADING' ? (
                <Button
                  disabled
                  className="bg-zinc-800 text-zinc-500 h-11 px-8 rounded-lg border border-zinc-700 w-[160px]"
                >
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  확인 중...
                </Button>
              ) : extensionStatus === 'NOT_INSTALLED' ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPolling(true);
                      checkInstallation();
                      setTimeout(() => setIsPolling(false), 1000);
                    }}
                    className="h-11 px-4 border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500"
                  >
                    {isPolling ? <Loader2 className="w-4 h-4 animate-spin" /> : '설치 확인'}
                  </Button>
                  <Button
                    onClick={handleInstallClick}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-lg shadow-lg shadow-primary/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    확장 프로그램 설치
                  </Button>
                </div>
              ) : extensionStatus === 'VERSION_MISMATCH' ? (
                <Button
                  onClick={() => setShowManualModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-lg shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <AlertCircle size={18} className="mr-2" />
                  업데이트 가이드 확인하기
                </Button>
              ) : !isBojLinked ? (
                <Button
                  onClick={() => router.push(`/profile/${user?.nickname}`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <User size={18} className="mr-2" />
                  백준 아이디 등록하기 (프로필)
                </Button>
              ) : extensionStatus === 'INSTALLED' || extensionStatus === 'MISMATCH' ? (
                <Button
                  onClick={handleLinkAccount}
                  disabled={isLinking}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLinking ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LinkIcon className="w-4 h-4 mr-2" />
                  )}
                  확장 프로그램 연동하기
                </Button>
              ) : (
                <Button
                  onClick={handleJoinClick}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {joinLabel || '미팅 시작'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Manual Installation Modal */}
      <ActionModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onConfirm={() => {
          window.open(DOWNLOAD_URL, '_blank');
          checkInstallation();
        }}
        title="확장 프로그램 수동 설치 가이드"
        confirmText="Zip 다운로드"
        cancelText="닫기"
        description={
          <div className="space-y-4 text-sm text-left">
            <p className="text-zinc-400">
              스토어 심사 지연으로 인해 현재 수동 설치가 필요합니다. 아래 절차를 따라주세요.
            </p>

            <div className="space-y-3 bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span className="text-zinc-300"><strong>Zip 파일 다운로드:</strong> 아래 버튼을 눌러 압축 파일을 다운로드하고 압축을 해제합니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span className="text-zinc-300"><strong>확장 프로그램 설정 이동:</strong> 크롬 주소창에 <code className="bg-zinc-800 px-1 rounded text-primary">chrome://extensions</code>를 입력합니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span className="text-zinc-300"><strong>개발자 모드 활성화:</strong> 우측 상단의 <strong>개발자 모드(Developer mode)</strong> 스위치를 켭니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <span className="text-zinc-300"><strong>압축해제된 확장 설치:</strong> 좌측 상단의 <strong>압축해제된 확장 프로그램을 로드합니다(Load unpacked)</strong> 버튼을 누르고, 압축을 푼 폴더를 선택합니다.</span>
              </div>
            </div>

            <p className="text-[11px] text-orange-500 font-medium">
              ※ 주의: 설치 후 해당 폴더를 삭제하면 확장 프로그램이 작동하지 않습니다. 안전한 곳에 보관해주세요.
            </p>
          </div>
        }
      />
    </TooltipProvider >
  );
};

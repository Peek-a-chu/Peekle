'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { toast } from 'sonner';
import { useLocalParticipant } from '@livekit/components-react';
import type { LocalParticipant } from 'livekit-client';

// 1. UI & Logic Component (Pure, accepts dependencies via props)
interface DeviceSectionInnerProps {
  localParticipant: LocalParticipant | null | undefined;
  isGlobal?: boolean;
}

const DeviceSectionInner = ({ localParticipant, isGlobal = false }: DeviceSectionInnerProps) => {
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
    isMicTestRunning,
    isSpeakerTestRunning,
    toggleMicTest,
    toggleSpeakerTest,
  } = useSettingsStore();

  const currentUserId = useRoomStore((state) => state.currentUserId);
  const participants = useRoomStore((state) => state.participants);
  const updateParticipant = useRoomStore((state) => state.updateParticipant);

  // Socket actions might fail if global, handled in handlers
  // In global mode, these hooks return default/empty processing safely usually
  const { updateStatus } = useStudySocketActions();

  const me = participants.find((p) => p.id === currentUserId);
  const isMuted = me?.isMuted ?? false;
  const isVideoOff = me?.isVideoOff ?? false;

  // 카메라 미리보기 상태 및 ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 장치 목록 상태
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  // 장치 목록 가져오기
  useEffect(() => {
    let mounted = true;

    const getDevices = async () => {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();

        // 라벨이 없는 경우(권한 없음) 권한 요청 시도
        const hasEmptyVideoLabel = devices.some(
          (device) => device.kind === 'videoinput' && !device.label,
        );
        const hasEmptyAudioLabel = devices.some(
          (device) =>
            (device.kind === 'audioinput' || device.kind === 'audiooutput') && !device.label,
        );

        if (hasEmptyAudioLabel || hasEmptyVideoLabel) {
          try {
            let audioStream: MediaStream | null = null;
            let videoStream: MediaStream | null = null;

            if (hasEmptyAudioLabel) {
              try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (e) {
                console.warn('[DeviceSection] Failed to get audio permission:', e);
              }
            }

            if (hasEmptyVideoLabel) {
              try {
                videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
              } catch (e) {
                console.warn('[DeviceSection] Failed to get video permission:', e);
              }
            }

            if (audioStream || videoStream) {
              devices = await navigator.mediaDevices.enumerateDevices();
            }

            if (audioStream) audioStream.getTracks().forEach((track) => track.stop());
            if (videoStream) videoStream.getTracks().forEach((track) => track.stop());
          } catch (err) {
            console.warn('[DeviceSection] Permission check error:', err);
          }
        }

        if (!mounted) return;

        setVideoDevices(devices.filter((device) => device.kind === 'videoinput'));
        setAudioDevices(devices.filter((device) => device.kind === 'audioinput'));
        setAudioOutputDevices(devices.filter((device) => device.kind === 'audiooutput'));
      } catch (error) {
        console.error('[DeviceSection] Failed to enumerate devices:', error);
      }
    };

    void getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // 카메라 미리보기 (로컬 설정값 기반)
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startPreview = async () => {
      if (isVideoOff && !isGlobal) {
        // 룸룸 상태면 isVideoOff 따름
      }

      try {
        if (selectedCameraId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedCameraId !== 'default' ? { exact: selectedCameraId } : undefined,
            },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        }
      } catch (e) {
        console.warn('Failed to start camera preview', e);
      }
    };

    if (!isVideoOff || isGlobal) {
      void startPreview();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [selectedCameraId, isVideoOff, isGlobal]);

  // 실제 마이크 입력 레벨
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 오디오 제어용 refs
  const gainNodeRef = useRef<GainNode | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // 마이크 레벨 측정
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let stopped = false;

    const startMetering = async () => {
      try {
        let stream: MediaStream | null = null;
        let isLocalStream = false;

        // 1. LiveKit (활성 트랙)
        if (localParticipant && !isMuted) {
          const trackReq = Array.from(localParticipant.audioTrackPublications.values()).find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.track?.kind === 'audio',
          );
          if (trackReq?.track?.mediaStreamTrack) {
            stream = new MediaStream([trackReq.track.mediaStreamTrack]);
          }
        }

        // 2. getUserMedia (없으면 직접 요청 - 레벨 미터용)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined,
              },
            });
            isLocalStream = true;
            localStream = stream;
          } catch (e) {
            console.warn('[DeviceSection] Failed to get local mic stream for metering:', e);
          }
        }

        if (stopped) {
          if (isLocalStream && stream) stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (!stream) {
          setMicLevel(0);
          return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          setMicLevel(0);
          return;
        }

        if (!audioContextRef.current) {
          audioContextRef.current =
            new // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (stopped) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          const level = Math.min(100, (average / 128) * 100 * 1.5);
          setMicLevel(level);

          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (err) {
        console.warn('Metering error', err);
        setMicLevel(0);
      }
    };

    void startMetering();

    return () => {
      stopped = true;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMuted, micVolume, selectedMicId, localParticipant]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  useEffect(() => {
    if (speakerGainNodeRef.current) {
      speakerGainNodeRef.current.gain.value = speakerVolume / 100;
    }
  }, [speakerVolume]);

  const handleMicToggle = async () => {
    if (isGlobal) {
      toast.info('스터디 룸 입장 후 다시 시도해주세요.');
      return;
    }

    if (!currentUserId || !me) return;

    const newMuted = !isMuted;
    updateParticipant(currentUserId, { isMuted: newMuted });

    if (updateStatus) updateStatus(newMuted, isVideoOff);

    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!newMuted);
    }
  };

  const handleVideoToggle = async () => {
    if (isGlobal) {
      toast.info('스터디 룸 입장 후 다시 시도해주세요.');
      return;
    }

    if (!currentUserId || !me) return;

    const newVideoOff = !isVideoOff;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });

    if (updateStatus) updateStatus(isMuted, newVideoOff);

    if (localParticipant) {
      await localParticipant.setCameraEnabled(!newVideoOff);
    }
  };

  const handleMicTest = async () => {
    if (isMicTestRunning) {
      if (micTestAudioRef.current) {
        micTestAudioRef.current.pause();
        micTestAudioRef.current = null;
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        gainNodeRef.current = null;
      }
      toggleMicTest();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicId !== 'default' ? { exact: selectedMicId } : undefined,
        },
      });

      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') await audioContext.resume();

      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      const inputGainNode = audioContext.createGain();
      inputGainNode.gain.value = micVolume / 100;

      const outputGainNode = audioContext.createGain();
      outputGainNode.gain.value = speakerVolume / 100;

      source.connect(inputGainNode);
      inputGainNode.connect(outputGainNode);
      outputGainNode.connect(destination);

      const audio = new Audio();
      audio.srcObject = destination.stream;
      audio.volume = 1.0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (selectedSpeakerId !== 'default' && (audio as any).setSinkId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (audio as any).setSinkId(selectedSpeakerId);
        } catch {
          // ignore
        }
      }

      await audio.play();
      micTestAudioRef.current = audio;
      gainNodeRef.current = inputGainNode;
      toggleMicTest();

      setTimeout(() => {
        if (isMicTestRunning) {
          if (micTestAudioRef.current) {
            micTestAudioRef.current.pause();
            micTestAudioRef.current = null;
            try {
              gainNodeRef.current?.disconnect();
            } catch {
              // ignore
            }
            toggleMicTest();
          }
        }
      }, 5000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`마이크 테스트 실패: ${message}`);
    }
  };

  const handleSpeakerTest = () => {
    if (isSpeakerTestRunning) {
      if (speakerGainNodeRef.current) {
        try {
          speakerGainNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        speakerGainNodeRef.current = null;
      }
      toggleSpeakerTest();
      return;
    }

    try {
      if (!audioContextRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;

      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440;
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 880;
      gainNode.gain.value = speakerVolume / 100;

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const stopTime = audioContext.currentTime + 2;
      oscillator1.start();
      oscillator1.stop(stopTime);
      oscillator2.start();
      oscillator2.stop(stopTime);

      speakerGainNodeRef.current = gainNode;
      toggleSpeakerTest();

      setTimeout(() => {
        try {
          speakerGainNodeRef.current?.disconnect();
          speakerGainNodeRef.current = null;
        } catch {
          // ignore
        }
        toggleSpeakerTest();
      }, 2000);

      toast.success('스피커 테스트 시작');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`스피커 테스트 실패: ${message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 카메라 섹션 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-muted-foreground">카메라</label>
          <Button
            variant={isVideoOff ? 'destructive' : 'default'}
            size="sm"
            onClick={handleVideoToggle}
            className="h-8 px-3 text-xs"
          >
            {isVideoOff ? (
              <>
                <VideoOff className="h-3.5 w-3.5 mr-1.5" />
                카메라 켜기
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5 mr-1.5" />
                카메라 끄기
              </>
            )}
          </Button>
        </div>
        <div className="relative">
          <select
            value={selectedCameraId}
            onChange={(e) => setCamera(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
          >
            {videoDevices.length > 0 ? (
              videoDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-card">
                  {device.label || `카메라 ${index + 1}`}
                </option>
              ))
            ) : (
              <option value="none" disabled>
                장치 없음
              </option>
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <Camera size={14} />
          </div>
        </div>

        {/* 카메라 미리보기 영역 */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-border mt-2">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              'w-full h-full object-cover transform scale-x-[-1]',
              isVideoOff && !isGlobal && 'hidden',
            )}
          />
          {isVideoOff && !isGlobal && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
              <VideoOff className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs">카메라가 꺼져있습니다</span>
            </div>
          )}
        </div>
      </section>

      {/* 마이크 섹션 */}
      <section className="space-y-4 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-muted-foreground">마이크</label>
          <Button
            variant={isMuted ? 'destructive' : 'default'}
            size="sm"
            onClick={handleMicToggle}
            className="h-8 px-3 text-xs"
          >
            {isMuted ? (
              <>
                <MicOff className="h-3.5 w-3.5 mr-1.5" />
                마이크 켜기
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5 mr-1.5" />
                마이크 끄기
              </>
            )}
          </Button>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedMicId}
              onChange={(e) => setMic(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-card">
                    {device.label || `마이크 ${index + 1}`}
                  </option>
                ))
              ) : (
                <option value="none" disabled>
                  장치 없음
                </option>
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <Mic size={14} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground">입력 볼륨</span>
            <span className="text-xs font-black text-foreground">{micVolume}%</span>
          </div>
          <Slider
            value={[micVolume]}
            onValueChange={([val]) => setMicVolume(val)}
            max={100}
            step={1}
            className="py-1"
          />
          {/* 실시간 마이크 레벨 미터 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-muted-foreground">현재 입력 레벨</span>
              <span className="text-[10px] font-black text-foreground">
                {Math.round(micLevel)}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-75',
                  micLevel > 70 ? 'bg-green-500' : micLevel > 40 ? 'bg-yellow-500' : 'bg-primary',
                )}
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleMicTest}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold border transition-all',
            isMicTestRunning
              ? 'bg-primary/10 text-primary border-primary/50 animate-pulse'
              : 'bg-card text-foreground border-border hover:bg-muted',
          )}
        >
          {isMicTestRunning ? '테스트 중지' : '테스트'}
        </button>
      </section>

      {/* 스피커 섹션 */}
      <section className="space-y-4 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-muted-foreground">스피커</label>
        </div>
        <div className="relative">
          <select
            value={selectedSpeakerId}
            onChange={(e) => setSpeaker(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
          >
            {audioOutputDevices.length > 0 ? (
              audioOutputDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId} className="bg-card">
                  {device.label || `스피커 ${index + 1}`}
                </option>
              ))
            ) : (
              <option value="default">기본 출력 장치</option>
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <Volume2 size={14} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground">출력 볼륨</span>
            <span className="text-xs font-black text-foreground">{speakerVolume}%</span>
          </div>
          <Slider
            value={[speakerVolume]}
            onValueChange={([val]) => setSpeakerVolume(val)}
            max={100}
            step={1}
            className="py-1"
          />
        </div>

        <button
          onClick={handleSpeakerTest}
          className={cn(
            'px-4 py-2 rounded-lg text-xs font-bold border transition-all',
            isSpeakerTestRunning
              ? 'bg-primary/10 text-primary border-primary/50 animate-pulse'
              : 'bg-card text-foreground border-border hover:bg-muted',
          )}
        >
          {isSpeakerTestRunning ? '테스트 중지' : '테스트'}
        </button>
      </section>
    </div>
  );
};

// 2. Connector for LiveKit Room (Only renders when in a Room)
const DeviceSectionConnected = () => {
  const { localParticipant } = useLocalParticipant();
  return <DeviceSectionInner localParticipant={localParticipant} isGlobal={false} />;
};

// 3. Main Export (Switcher)
interface DeviceSectionProps {
  isGlobal?: boolean;
}

const DeviceSection = ({ isGlobal = false }: DeviceSectionProps) => {
  // If global, we cannot use LiveKit hooks. Pass null.
  if (isGlobal) {
    return <DeviceSectionInner localParticipant={null} isGlobal={true} />;
  }
  // If local, we must use LiveKit hooks to get context.
  return <DeviceSectionConnected />;
};

export default DeviceSection;

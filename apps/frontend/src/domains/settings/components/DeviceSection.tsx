'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mic, MicOff, Video, VideoOff, Volume2, Circle } from 'lucide-react';
import { useSettingsStore } from '../hooks/useSettingsStore';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { useStudySocketActions } from '@/domains/study/hooks/useStudySocket';
import { toast } from 'sonner';
import type { Publisher } from 'openvidu-browser';

const DeviceSection = () => {
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
  const { updateStatus } = useStudySocketActions();
  const me = participants.find((p) => p.id === currentUserId);
  const isMuted = me?.isMuted ?? false;
  const isVideoOff = me?.isVideoOff ?? false;

  // 실제 마이크 입력 레벨
  const [micLevel, setMicLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 오디오 제어용 refs
  const gainNodeRef = useRef<GainNode | null>(null);
  const micTestDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerTestAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakerGainNodeRef = useRef<GainNode | null>(null);

  // OpenVidu publisher에서 오디오 레벨 측정 및 볼륨 제어
  useEffect(() => {
    const publisher = (window as any).__openviduPublisher as Publisher | undefined;
    
    if (!publisher) {
      setMicLevel(0);
      return;
    }

    try {
      const stream = publisher.stream.getMediaStream();
      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length === 0 || isMuted) {
        setMicLevel(0);
        return;
      }

      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      
      // GainNode 생성 (입력 볼륨 제어)
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
      }
      
      const gainNode = gainNodeRef.current;
      gainNode.gain.value = micVolume / 100; // 0-1 범위로 변환
      
      if (!analyserRef.current) {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      
      // source -> gainNode -> analyser 연결
      source.connect(gainNode);
      gainNode.connect(analyser);

      const updateLevel = () => {
        if (!analyser || !dataArray) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        // 평균 레벨 계산
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // 0-100 범위로 정규화 (0-255를 0-100으로)
        const normalizedLevel = Math.min(100, (average / 255) * 100);
        setMicLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      };
    } catch (error) {
      console.error('[DeviceSection] Failed to measure audio level:', error);
      setMicLevel(0);
    }
  }, [isMuted, micVolume]);

  // 입력 볼륨 변경 시 OpenVidu publisher에 적용
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micVolume / 100;
    }
  }, [micVolume]);

  // 출력 볼륨 변경 시 스피커 볼륨 적용
  useEffect(() => {
    if (speakerGainNodeRef.current) {
      speakerGainNodeRef.current.gain.value = speakerVolume / 100;
    }
  }, [speakerVolume]);

  // 마이크/카메라 토글 핸들러
  const handleMicToggle = () => {
    if (!currentUserId || !me) return;

    // Optimistic Update
    const newMuted = !isMuted;
    updateParticipant(currentUserId, { isMuted: newMuted });

    // Toggle Mute (OpenVidu + Socket)
    updateStatus(newMuted, isVideoOff);
    
    // OpenVidu 오디오 토글도 호출
    const toggleAudio = (window as any).__openviduToggleAudio;
    if (toggleAudio) {
      toggleAudio();
    }
  };

  const handleVideoToggle = () => {
    if (!currentUserId || !me) return;

    // Optimistic Update
    const newVideoOff = !isVideoOff;
    updateParticipant(currentUserId, { isVideoOff: newVideoOff });

    // Toggle Video (OpenVidu + Socket)
    updateStatus(isMuted, newVideoOff);
    
    // OpenVidu 비디오 토글도 호출
    const toggleVideo = (window as any).__openviduToggleVideo;
    if (toggleVideo) {
      toggleVideo();
    }
  };

  // 마이크 테스트: 마이크 입력을 스피커로 출력
  const handleMicTest = async () => {
    if (isMicTestRunning) {
      // 테스트 중지
      if (micTestAudioRef.current) {
        micTestAudioRef.current.pause();
        micTestAudioRef.current.srcObject = null;
        micTestAudioRef.current = null;
      }
      if (micTestDestinationRef.current) {
        try {
          micTestDestinationRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        micTestDestinationRef.current = null;
      }
      toggleMicTest();
      return;
    }

    try {
      const publisher = (window as any).__openviduPublisher as Publisher | undefined;
      if (!publisher) {
        toast.error('OpenVidu 연결을 찾을 수 없습니다. 비디오 세션에 먼저 참여해주세요.');
        return;
      }

      const stream = publisher.stream.getMediaStream();
      if (!stream) {
        toast.error('오디오 스트림을 찾을 수 없습니다.');
        return;
      }

      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        toast.error('마이크 트랙을 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
        return;
      }

      if (isMuted) {
        toast.error('마이크가 꺼져 있습니다. 마이크를 켜주세요.');
        return;
      }

      // AudioContext 생성 및 resume
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // 마이크 입력을 스피커로 연결
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();
      
      // GainNode로 볼륨 제어 (입력 볼륨 적용)
      const inputGainNode = audioContext.createGain();
      inputGainNode.gain.value = micVolume / 100;
      
      // 출력 볼륨도 적용
      const outputGainNode = audioContext.createGain();
      outputGainNode.gain.value = speakerVolume / 100;
      
      source.connect(inputGainNode);
      inputGainNode.connect(outputGainNode);
      outputGainNode.connect(destination);
      
      // MediaStream을 Audio 요소로 재생
      const audio = new Audio();
      audio.srcObject = destination.stream;
      audio.volume = 1.0; // 이미 gainNode에서 제어하므로 1.0으로 설정
      
      // 재생 시도
      try {
        await audio.play();
      } catch (playError: any) {
        // 재생 실패 시 더 구체적인 에러 메시지
        console.error('[DeviceSection] Audio play failed:', playError);
        if (playError.name === 'NotAllowedError') {
          toast.error('오디오 재생이 차단되었습니다. 브라우저 설정에서 자동 재생을 허용해주세요.');
        } else if (playError.name === 'NotSupportedError') {
          toast.error('오디오 형식을 지원하지 않습니다.');
        } else {
          toast.error('마이크 테스트를 시작할 수 없습니다. 오디오 재생 오류가 발생했습니다.');
        }
        // 정리
        source.disconnect();
        inputGainNode.disconnect();
        outputGainNode.disconnect();
        destination.disconnect();
        return;
      }
      
      micTestDestinationRef.current = destination;
      micTestAudioRef.current = audio;
      toggleMicTest();
      toast.success('마이크 테스트가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start mic test:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      if (errorMessage.includes('permission') || errorMessage.includes('권한')) {
        toast.error('마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('찾을 수 없')) {
        toast.error('마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.');
      } else {
        toast.error(`마이크 테스트를 시작할 수 없습니다: ${errorMessage}`);
      }
    }
  };

  // 스피커 테스트: 데모 소리 재생
  const handleSpeakerTest = async () => {
    if (isSpeakerTestRunning) {
      // 테스트 중지
      if (speakerTestAudioRef.current) {
        speakerTestAudioRef.current.pause();
        speakerTestAudioRef.current = null;
      }
      if (speakerGainNodeRef.current) {
        try {
          speakerGainNodeRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
        speakerGainNodeRef.current = null;
      }
      toggleSpeakerTest();
      return;
    }

    try {
      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // 오실레이터로 테스트 톤 생성 (440Hz = A4 음, 880Hz = A5 음)
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440; // A4 음
      
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 880; // A5 음
      
      // 출력 볼륨 적용
      gainNode.gain.value = speakerVolume / 100;
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 2초 후 자동 중지
      const stopTime = audioContext.currentTime + 2;
      oscillator1.start();
      oscillator1.stop(stopTime);
      oscillator2.start();
      oscillator2.stop(stopTime);
      
      speakerGainNodeRef.current = gainNode;
      
      toggleSpeakerTest();
      
      // 2초 후 정리
      setTimeout(() => {
        try {
          if (speakerGainNodeRef.current) {
            speakerGainNodeRef.current.disconnect();
            speakerGainNodeRef.current = null;
          }
        } catch (e) {
          // Ignore disconnect errors
        }
        if (isSpeakerTestRunning) {
          toggleSpeakerTest();
        }
      }, 2000);
      
      toast.success('스피커 테스트가 시작되었습니다.');
    } catch (error: any) {
      console.error('[DeviceSection] Failed to start speaker test:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      toast.error(`스피커 테스트를 시작할 수 없습니다: ${errorMessage}`);
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
            <option value="default" className="bg-card">
              내장 카메라
            </option>
            <option value="ext-1" className="bg-card">
              외부 웹캠 1
            </option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <Camera size={14} />
          </div>
        </div>

        {/* 카메라 미리보기 영역 */}
        <div className="aspect-video w-full bg-muted/50 rounded-xl border border-border flex flex-col items-center justify-center gap-3 relative overflow-hidden group">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
            <Camera size={32} />
          </div>
          <span className="text-xs font-bold text-muted-foreground">카메라 미리보기</span>

          {!isVideoOff && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full">
              <Circle size={8} className="fill-red-500 text-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-bold opacity-80 uppercase tracking-wider">
                Preview Active
              </span>
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
              <option value="default" className="bg-card">
                내장 마이크
              </option>
              <option value="ext-mic" className="bg-card">
                외부 마이크 (USB)
              </option>
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
              <span className="text-[10px] font-black text-foreground">{Math.round(micLevel)}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-75',
                  micLevel > 70 ? 'bg-green-500' : micLevel > 40 ? 'bg-yellow-500' : 'bg-primary'
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
        <div className="space-y-3">
          <label className="text-sm font-bold text-muted-foreground">스피커</label>
          <div className="relative">
            <select
              value={selectedSpeakerId}
              onChange={(e) => setSpeaker(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-0 transition-all appearance-none text-foreground cursor-pointer"
            >
              <option value="default" className="bg-card">
                내장 스피커
              </option>
              <option value="headphone" className="bg-card">
                헤드폰
              </option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <Volume2 size={14} />
            </div>
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
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all',
            isSpeakerTestRunning
              ? 'bg-primary/15 border-primary/50 text-primary'
              : 'bg-card text-foreground border-border hover:bg-muted',
          )}
        >
          <Volume2 size={14} className={isSpeakerTestRunning ? 'animate-bounce' : ''} />
          <span>{isSpeakerTestRunning ? '재생 중...' : '테스트'}</span>
        </button>
      </section>
    </div>
  );
};

export default DeviceSection;

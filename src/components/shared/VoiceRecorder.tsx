'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  dishName?: string;
  onResult: (result: { transcript: string; description: string; suggestedName?: string }) => void;
  mode?: 'transcribe' | 'describe';
}

export default function VoiceRecorder({ dishName, onResult, mode = 'describe' }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use webm if supported, fallback to mp4
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) return; // Too short, ignore

        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, `recording.${mimeType.includes('webm') ? 'webm' : 'm4a'}`);
          formData.append('mode', mode);
          if (dishName) formData.append('dishName', dishName);

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            onResult(data);
          }
        } catch {
          // Silently fail
        } finally {
          setIsProcessing(false);
          setDuration(0);
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch {
      // Mic permission denied or not available
    }
  }, [dishName, mode, onResult]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FF8C00]/10 rounded-xl text-sm text-[#FF8C00]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>AI 正在處理語音...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-3 w-full px-4 py-3 bg-red-50 border-2 border-red-300 rounded-xl text-sm text-red-600 font-medium animate-pulse transition-all"
      >
        <span className="relative flex h-4 w-4">
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
          <Square className="relative w-4 h-4 fill-red-500 text-red-500" />
        </span>
        <span>錄音中 {formatDuration(duration)} — 點擊停止</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className="flex items-center gap-2 px-4 py-2.5 bg-[#FF8C00]/10 border border-[#FF8C00]/20 rounded-xl text-sm text-[#FF8C00] font-medium hover:bg-[#FF8C00]/20 transition-colors"
    >
      <Mic className="w-4 h-4" />
      <span>AI 語音輸入 — 說一句話描述這道菜</span>
    </button>
  );
}

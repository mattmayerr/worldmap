"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isVoiceSupported,
  recordSpeech,
  speakViaApi,
  stopSpeaking,
  transcribeViaApi,
} from "@/lib/voice";

interface UseVoicePracticeOptions {
  enabled: boolean;
  onTranscript: (text: string) => void;
  onVoiceError?: (message: string) => void;
}

export function useVoicePractice({
  enabled,
  onTranscript,
  onVoiceError,
}: UseVoicePracticeOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const supported = isVoiceSupported();
  const enabledRef = useRef(enabled);
  const onTranscriptRef = useRef(onTranscript);
  const onVoiceErrorRef = useRef(onVoiceError);
  const listeningRef = useRef(false);
  const abortRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onVoiceErrorRef.current = onVoiceError;
  }, [onVoiceError]);

  const stopListening = useCallback(() => {
    abortRef.current = true;
    listeningRef.current = false;
    setListening(false);
  }, []);

  const speak = useCallback(
    async (text: string, options?: { onStart?: () => void }) => {
      if (!enabledRef.current || !text.trim()) return;

      abortRef.current = true;
      listeningRef.current = false;
      setListening(false);
      setSpeaking(true);

      try {
        await speakViaApi(text, options);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not play audio.";
        onVoiceErrorRef.current?.(message);
        throw error;
      } finally {
        setSpeaking(false);
      }
    },
    []
  );

  const startListening = useCallback(async () => {
    if (!enabledRef.current || !supported || listeningRef.current || transcribing) return;

    stopSpeaking();
    abortRef.current = false;
    listeningRef.current = true;
    setListening(true);

    try {
      const blob = await recordSpeech({ shouldAbort: () => abortRef.current });

      if (abortRef.current || !enabledRef.current) {
        return;
      }

      if (blob.size < 1000) {
        onVoiceErrorRef.current?.("No speech detected. Try again.");
        return;
      }

      listeningRef.current = false;
      setListening(false);
      setTranscribing(true);

      const text = await transcribeViaApi(blob);

      if (abortRef.current || !enabledRef.current) {
        return;
      }

      onTranscriptRef.current(text);
    } catch (error) {
      if (abortRef.current) return;
      const message = error instanceof Error ? error.message : "Voice input failed.";
      if (message !== "aborted") {
        onVoiceErrorRef.current?.(message);
      }
    } finally {
      listeningRef.current = false;
      setListening(false);
      setTranscribing(false);
    }
  }, [supported, transcribing]);

  useEffect(() => {
    if (!enabled) {
      abortRef.current = true;
      stopListening();
      stopSpeaking();
      setSpeaking(false);
      setTranscribing(false);
    }
  }, [enabled, stopListening]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopSpeaking();
    };
  }, []);

  return {
    supported,
    listening,
    speaking,
    transcribing,
    speak,
    startListening: () => {
      void startListening();
    },
    stopListening,
    stopSpeaking,
  };
}

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
}

let activeAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
}

export async function speakViaApi(
  text: string,
  options?: { onStart?: () => void }
): Promise<void> {
  if (!text.trim()) return;

  stopSpeaking();

  const response = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not play the prospect's voice.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    activeAudio = audio;
    let started = false;
    const notifyStart = () => {
      if (started) return;
      started = true;
      options?.onStart?.();
    };
    audio.onplaying = notifyStart;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      reject(new Error("Audio playback failed."));
    };
    void audio.play().then(notifyStart).catch(reject);
  });
}

export async function transcribeViaApi(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Transcription failed.");
  }

  return data.text as string;
}

interface RecordOptions {
  maxMs?: number;
  silenceMs?: number;
  minMs?: number;
  shouldAbort?: () => boolean;
}

export async function recordSpeech(options: RecordOptions = {}): Promise<Blob> {
  const maxMs = options.maxMs ?? 30000;
  const silenceMs = options.silenceMs ?? 1800;
  const minMs = options.minMs ?? 800;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported("audio/webm")
    ? "audio/webm"
    : "audio/mp4";

  const mediaRecorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const sampleBuffer = new Uint8Array(analyser.fftSize);

  return new Promise<Blob>((resolve, reject) => {
    let silenceStart = 0;
    let speechDetected = false;
    const startedAt = Date.now();
    let monitorId = 0;

    const cleanup = () => {
      cancelAnimationFrame(monitorId);
      stream.getTracks().forEach((track) => track.stop());
      void audioContext.close();
    };

    const finish = () => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    };

    mediaRecorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: mimeType }));
    };

    mediaRecorder.onerror = () => {
      cleanup();
      reject(new Error("Recording failed."));
    };

    const monitor = () => {
      if (options.shouldAbort?.()) {
        reject(new Error("aborted"));
        finish();
        return;
      }

      analyser.getByteTimeDomainData(sampleBuffer);

      let sum = 0;
      for (let i = 0; i < sampleBuffer.length; i++) {
        const normalized = (sampleBuffer[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / sampleBuffer.length);
      const elapsed = Date.now() - startedAt;

      if (rms > 0.02) {
        speechDetected = true;
        silenceStart = 0;
      } else if (speechDetected && elapsed > minMs) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart >= silenceMs) {
          finish();
          return;
        }
      }

      if (elapsed >= maxMs) {
        finish();
        return;
      }

      monitorId = requestAnimationFrame(monitor);
    };

    mediaRecorder.start(250);
    monitorId = requestAnimationFrame(monitor);
  });
}

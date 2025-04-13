"use client";

import { transcribeAudio } from "@/services/huggingface";
import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface TranscriptItem {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: string;
}

const Transcribe: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [recording, setRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const router = useRouter();
  const audioChunksRef = useRef<Float32Array[]>([]);
  const activeRecognitions = useRef<Set<string>>(new Set());
  const VOLUME_THRESHOLD = 0.01; 
  const MIN_SPEECH_DURATION = 1000;

  // User Auth
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }

      setLoading(false);
    };

    getSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.push("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.subscription?.unsubscribe();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [router]);

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;

    const wavBuffer = new ArrayBuffer(44 + length * blockAlign);
    const view = new DataView(wavBuffer);

    // Write WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + length * blockAlign, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, "data");
    view.setUint32(40, length * blockAlign, true);

    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(channel)[i])
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  const processAudioBuffer = async (buffer: AudioBuffer): Promise<string> => {
    try {
      const wavBlob = audioBufferToWav(buffer);
      const result = await transcribeAudio(wavBlob);

      if (!result?.text) {
        return "";
      }

      const englishOnly = result.text.replace(/[^\x00-\x7F]/g, "").trim();

      const commonFalsePositives = ["thank you", "thanks", "hello", "hi"];
      if (commonFalsePositives.includes(englishOnly.toLowerCase())) {
        return "";
      }

      return englishOnly || "";
    } catch (error) {
      console.error("Processing error:", error);
      return "";
    }
  };

  const cleanTranscript = (text: string): string => {
    let englishText = text.replace(/[^\x00-\x7F]/g, " ");

    return englishText
      .replace(/\[.*?\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const startRecording = async () => {
    try {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 16000,
        latencyHint: "interactive",
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      let lastProcessTime = 0;
      const processDebounce = 2000;
      let isSpeechDetected = false;
      let speechStartTime = 0;
      let speechChunks: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS volume
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Detect speech based on volume threshold
        if (rms > VOLUME_THRESHOLD) {
          if (!isSpeechDetected) {
            isSpeechDetected = true;
            speechStartTime = Date.now();
            speechChunks = [];
          }
          speechChunks.push(new Float32Array(inputData));
        } else {
          if (isSpeechDetected) {
            // Check if speech duration was long enough
            const speechDuration = Date.now() - speechStartTime;
            if (speechDuration >= MIN_SPEECH_DURATION) {
              audioChunksRef.current.push(...speechChunks);

              const now = Date.now();
              if (now - lastProcessTime > processDebounce) {
                lastProcessTime = now;
                processChunks();
              }
            }
            isSpeechDetected = false;
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;

      setRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert(
        `Recording failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setRecording(false);
    }
  };

  const processChunks = async () => {
    if (isProcessing || audioChunksRef.current.length < 8) return;

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];
    const recognitionId = Date.now().toString();
    activeRecognitions.current.add(recognitionId);

    try {
      setIsProcessing(true);
      const merged = mergeAudioChunks(chunks);
      const audioBuffer = audioContextRef.current!.createBuffer(
        1,
        merged.length,
        16000
      );
      audioBuffer.getChannelData(0).set(merged);

      const timestamp = new Date().toLocaleTimeString();

      setTranscript((prev) => [
        ...prev,
        {
          id: recognitionId,
          text: `[${timestamp}] ...`,
          isFinal: false,
          timestamp,
        },
      ]);

      const text = await processAudioBuffer(audioBuffer);
      if (!text.trim()) {
        setTranscript((prev) =>
          prev.filter((item) => item.id !== recognitionId)
        );
        return;
      }

      if (activeRecognitions.current.has(recognitionId)) {
        setTranscript((prev) =>
          prev.map((item) =>
            item.id === recognitionId
              ? { ...item, text: `[${timestamp}] ${text}`, isFinal: true }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Transcription error:", error);
    } finally {
      activeRecognitions.current.delete(recognitionId);
      setIsProcessing(false);
    }
  };

  const mergeAudioChunks = (chunks: Float32Array[]): Float32Array => {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(length);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    activeRecognitions.current.clear();
    setRecording(false);
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript.map((t) => t.text).join("\n")], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="subtitle">Loading...</p>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <div className="stars" />
      <h1 className="title">Verba</h1>

      {user && (
        <>
          <p className="subtitle">Welcome, {user.email}</p>
          <button className="cta-button" onClick={handleLogout}>
            Logout
          </button>
        </>
      )}

      <div style={{ marginTop: "2rem" }}>
        <button
          className="cta-button"
          onClick={recording ? stopRecording : startRecording}
          disabled={isProcessing}
        >
          {recording ? "Stop Recording" : "Start Recording"}
          {isProcessing && " (Processing...)"}
        </button>
        <button
          className="cta-button"
          onClick={downloadTranscript}
          style={{ marginLeft: "1rem" }}
          disabled={transcript.length === 0 || isProcessing}
        >
          Download Transcript
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#111122",
          borderRadius: "12px",
          marginTop: "2rem",
          padding: "1rem",
          width: "80%",
          maxWidth: "700px",
          height: "250px",
          overflowY: "auto",
          textAlign: "left",
          fontSize: "1rem",
          zIndex: 2,
        }}
      >
        {transcript.length > 0 ? (
          transcript.map((item) => (
            <p
              key={item.id}
              style={{ color: item.isFinal ? "inherit" : "#aaa" }}
            >
              {item.text}
            </p>
          ))
        ) : (
          <p style={{ color: "#888" }}>Transcript will appear here...</p>
        )}
      </div>
    </div>
  );
};

export default Transcribe;

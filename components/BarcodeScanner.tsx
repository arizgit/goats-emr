"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (value: string) => void;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector || null;
}

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectionRef = useRef<{ value: string; at: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [scanStatus, setScanStatus] = useState("Align the QR code inside the square.");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const emitDetection = (raw: string) => {
    const value = raw.trim();
    if (!value) return;

    const now = Date.now();
    const last = lastDetectionRef.current;
    if (last && last.value === value && now - last.at < 1800) return;

    lastDetectionRef.current = { value, at: now };
    setScanStatus(`Detected: ${value}`);
    onDetectedRef.current(value);
  };

  const pickPreferredCamera = (cameras: MediaDeviceInfo[]) => {
    const rearCamera = cameras.find((device) =>
      /(back|rear|environment|world)/i.test(device.label)
    );
    return rearCamera || cameras[cameras.length - 1] || cameras[0];
  };

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let lastAttemptAt = 0;

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    const zxingReader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 100,
      delayBetweenScanSuccess: 1200
    });

    const Detector = getBarcodeDetector();
    const nativeDetector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const decodeFrame = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }

      const now = Date.now();
      // ~8 attempts/sec keeps CPU reasonable on phones.
      if (now - lastAttemptAt < 120) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }
      lastAttemptAt = now;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }

      // Crop a centered square — denser pixels on the QR than full-frame decode.
      const side = Math.floor(Math.min(vw, vh) * 0.72);
      const sx = Math.floor((vw - side) / 2);
      const sy = Math.floor((vh - side) / 2);
      const size = Math.min(720, side);

      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }

      ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);

      try {
        if (nativeDetector) {
          const codes = await nativeDetector.detect(canvas);
          const value = codes[0]?.rawValue?.trim();
          if (value) emitDetection(value);
        }
      } catch {
        // Native detector unavailable for this frame — fall through to ZXing.
      }

      try {
        const result = zxingReader.decodeFromCanvas(canvas);
        const value = result.getText().trim();
        if (value) emitDetection(value);
      } catch {
        // No QR in this frame.
      }

      if (!cancelled) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
      }
    };

    const start = async () => {
      try {
        lastDetectionRef.current = null;
        setError("");
        setScanStatus("Align the QR code inside the square.");
        setTorchEnabled(false);

        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(videoDevices);

        if (videoDevices.length === 0) {
          setError("No camera device found.");
          return;
        }

        const preferred = selectedDeviceId
          ? videoDevices.find((d) => d.deviceId === selectedDeviceId) || pickPreferredCamera(videoDevices)
          : pickPreferredCamera(videoDevices);

        if (!selectedDeviceId && preferred?.deviceId) {
          setSelectedDeviceId(preferred.deviceId);
          return;
        }

        if (!videoRef.current || !preferred) return;

        stopStream();

        // Prefer facingMode on first open; exact deviceId can fail on some iOS builds.
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? {
                deviceId: { ideal: selectedDeviceId },
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        await videoRef.current.play();

        // Nudge continuous autofocus / zoom when the platform allows it.
        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const capabilities = track.getCapabilities?.() as
              | (MediaTrackCapabilities & { focusMode?: string[]; zoom?: { min: number; max: number } })
              | undefined;
            const advanced: Record<string, unknown>[] = [];
            if (capabilities?.focusMode?.includes("continuous")) {
              advanced.push({ focusMode: "continuous" });
            }
            if (capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min) {
              const mid = Math.min(
                capabilities.zoom.max,
                Math.max(capabilities.zoom.min, (capabilities.zoom.min + capabilities.zoom.max) / 3)
              );
              advanced.push({ zoom: mid });
            }
            if (advanced.length) {
              await track.applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] });
            }
          } catch {
            // Optional constraints — ignore if unsupported.
          }
        }

        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
      } catch {
        if (!cancelled) setError("Hindi mabuksan ang camera. Please allow camera access.");
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopStream();
    };
  }, [selectedDeviceId]);

  const toggleTorch = async () => {
    const track =
      videoRef.current?.srcObject instanceof MediaStream
        ? videoRef.current.srcObject.getVideoTracks()[0]
        : null;

    if (!track) return;

    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet]
      });
      setTorchEnabled((prev) => !prev);
    } catch {
      setError("Torch not supported on this device.");
    }
  };

  const switchCamera = () => {
    if (devices.length <= 1) return;

    const currentIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % devices.length;
    setTorchEnabled(false);
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-farm-100 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-[3/4] w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[58%] max-h-[20rem] w-[72%] max-w-[20rem] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>
      <button
        type="button"
        onClick={switchCamera}
        disabled={devices.length <= 1}
        className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        Switch Camera
      </button>
      <button
        type="button"
        onClick={toggleTorch}
        className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white"
      >
        {torchEnabled ? "Turn Torch Off" : "Turn Torch On"}
      </button>
      <p className="rounded-lg bg-white p-3 text-sm">{scanStatus}</p>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

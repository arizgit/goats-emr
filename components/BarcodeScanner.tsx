"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import jsQR from "jsqr";
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

function isAndroidChrome(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android/i.test(ua) && /Chrome/i.test(ua) && !/Edg/i.test(ua);
}

function invertImageData(source: ImageData): ImageData {
  const copy = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const { data } = copy;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return copy;
}

function boostContrast(source: ImageData): ImageData {
  const copy = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const { data } = copy;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = gray < 140 ? 0 : 255;
    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }
  return copy;
}

/**
 * Map the on-screen viewfinder square back into video-pixel coordinates.
 * Required when CSS object-fit crops/letterboxes the stream (common Android Chrome mismatch).
 */
function getViewfinderVideoCrop(
  video: HTMLVideoElement,
  viewfinderRatio = 0.72
): { sx: number; sy: number; sw: number; sh: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const rect = video.getBoundingClientRect();
  const displayW = Math.max(1, rect.width);
  const displayH = Math.max(1, rect.height);

  const videoRatio = vw / vh;
  const displayRatio = displayW / displayH;

  // object-fit: contain — visible video area inside the element
  let visibleW = displayW;
  let visibleH = displayH;
  let offsetX = 0;
  let offsetY = 0;

  if (videoRatio > displayRatio) {
    visibleW = displayW;
    visibleH = displayW / videoRatio;
    offsetY = (displayH - visibleH) / 2;
  } else {
    visibleH = displayH;
    visibleW = displayH * videoRatio;
    offsetX = (displayW - visibleW) / 2;
  }

  const boxSide = Math.min(visibleW, visibleH) * viewfinderRatio;
  const boxLeft = offsetX + (visibleW - boxSide) / 2;
  const boxTop = offsetY + (visibleH - boxSide) / 2;

  const scaleX = vw / visibleW;
  const scaleY = vh / visibleH;

  const sx = Math.max(0, Math.floor((boxLeft - offsetX) * scaleX));
  const sy = Math.max(0, Math.floor((boxTop - offsetY) * scaleY));
  const sw = Math.min(vw - sx, Math.floor(boxSide * scaleX));
  const sh = Math.min(vh - sy, Math.floor(boxSide * scaleY));

  return { sx, sy, sw: Math.max(1, sw), sh: Math.max(1, sh) };
}

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectionRef = useRef<{ value: string; at: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState("Align the QR code inside the square. Hold steady.");
  const [photoBusy, setPhotoBusy] = useState(false);

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
    // Prefer labeled rear camera; avoid ultrawide/macro if labeled.
    const standardRear = cameras.find((device) =>
      /(back|rear|environment)/i.test(device.label) && !/(ultra|wide|macro|tele)/i.test(device.label)
    );
    return standardRear || rearCamera || cameras[cameras.length - 1] || cameras[0];
  };

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let lastAttemptAt = 0;
    let passIndex = 0;
    const android = isAndroidChrome();

    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    const zxingReader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 50,
      delayBetweenScanSuccess: 1000
    });

    const Detector = getBarcodeDetector();
    const nativeDetector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
    if (!workCanvasRef.current) workCanvasRef.current = document.createElement("canvas");

    const stopStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const tryJsQr = (imageData: ImageData): string | null => {
      const variants = [imageData, invertImageData(imageData), boostContrast(imageData)];
      for (const variant of variants) {
        const code = jsQR(variant.data, variant.width, variant.height, {
          inversionAttempts: "attemptBoth"
        });
        if (code?.data?.trim()) return code.data.trim();
      }
      return null;
    };

    const tryZxing = (canvas: HTMLCanvasElement): string | null => {
      try {
        return zxingReader.decodeFromCanvas(canvas).getText().trim() || null;
      } catch {
        return null;
      }
    };

    const paintCrop = (
      video: HTMLVideoElement,
      target: HTMLCanvasElement,
      crop: { sx: number; sy: number; sw: number; sh: number },
      maxSize: number
    ) => {
      const side = Math.max(crop.sw, crop.sh);
      const size = Math.min(maxSize, side);
      target.width = size;
      target.height = size;
      const ctx = target.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, size, size);
      return ctx.getImageData(0, 0, size, size);
    };

    const paintFull = (video: HTMLVideoElement, target: HTMLCanvasElement) => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.min(1, 1280 / Math.max(vw, vh));
      const width = Math.floor(vw * scale);
      const height = Math.floor(vh * scale);
      target.width = width;
      target.height = height;
      const ctx = target.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);
      return ctx.getImageData(0, 0, width, height);
    };

    const decodeFrame = async () => {
      if (cancelled) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const work = workCanvasRef.current;
      if (!video || !canvas || !work || video.readyState < 2) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }

      const now = Date.now();
      // Android devices are often slower — don't starve the main thread.
      const minInterval = android ? 120 : 80;
      if (now - lastAttemptAt < minInterval) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }
      lastAttemptAt = now;

      if (!video.videoWidth || !video.videoHeight) {
        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
        return;
      }

      const strategy = passIndex % (android ? 5 : 4);
      passIndex += 1;

      try {
        const viewfinderCrop = getViewfinderVideoCrop(video, 0.78);

        if (strategy === 0 && nativeDetector) {
          // Prefer native detector on the exact on-screen square (best for Android Chrome).
          const imageData = paintCrop(video, canvas, viewfinderCrop, android ? 720 : 960);
          if (imageData) {
            const codes = await nativeDetector.detect(canvas);
            const value = codes[0]?.rawValue?.trim();
            if (value) emitDetection(value);
          }
        } else if (strategy === 1) {
          const imageData = paintCrop(video, canvas, viewfinderCrop, android ? 720 : 960);
          if (imageData) {
            const value = tryJsQr(imageData) || tryZxing(canvas);
            if (value) emitDetection(value);
          }
        } else if (strategy === 2) {
          const tighter = getViewfinderVideoCrop(video, 0.55);
          const imageData = paintCrop(video, canvas, tighter, 640);
          if (imageData) {
            const value = tryJsQr(imageData) || tryZxing(canvas);
            if (value) emitDetection(value);
          }
        } else if (strategy === 3) {
          const imageData = paintFull(video, work);
          if (imageData) {
            if (nativeDetector) {
              const codes = await nativeDetector.detect(work);
              const nativeValue = codes[0]?.rawValue?.trim();
              if (nativeValue) {
                emitDetection(nativeValue);
              } else {
                const value = tryJsQr(imageData) || tryZxing(work);
                if (value) emitDetection(value);
              }
            } else {
              const value = tryJsQr(imageData) || tryZxing(work);
              if (value) emitDetection(value);
            }
          }
        } else {
          // Extra Android pass: slightly larger than the square.
          const wider = getViewfinderVideoCrop(video, 0.92);
          const imageData = paintCrop(video, canvas, wider, 800);
          if (imageData) {
            const value = tryJsQr(imageData) || tryZxing(canvas);
            if (value) emitDetection(value);
          }
        }
      } catch {
        // Keep scanning.
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
        setScanStatus("Align the QR code inside the square. Hold steady.");
        setTorchEnabled(false);

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Camera not supported in this browser.");
          return;
        }

        stopStream();

        // Android Chrome is most reliable with facingMode only (no deviceId / resolution fight).
        // iOS/desktop can use device switching after permission.
        let stream: MediaStream;
        if (selectedDeviceId) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              deviceId: { exact: selectedDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
        } else if (android) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: { exact: "environment" } }
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: "environment" }
            });
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // Enumerate after permission so labels populate (needed for Switch Camera).
        try {
          const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
          if (!cancelled) setDevices(videoDevices);
        } catch {
          setDevices([]);
        }

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();

        // Wait until metadata gives real dimensions before decoding.
        if (!videoRef.current.videoWidth) {
          await new Promise<void>((resolve) => {
            const el = videoRef.current;
            if (!el) {
              resolve();
              return;
            }
            const onMeta = () => {
              el.removeEventListener("loadedmetadata", onMeta);
              resolve();
            };
            el.addEventListener("loadedmetadata", onMeta);
            window.setTimeout(resolve, 1500);
          });
        }

        const track = stream.getVideoTracks()[0];
        if (track) {
          try {
            const capabilities = track.getCapabilities?.() as
              | (MediaTrackCapabilities & {
                  focusMode?: string[];
                  zoom?: { min: number; max: number };
                })
              | undefined;
            const advanced: Record<string, unknown>[] = [];
            if (capabilities?.focusMode?.includes("continuous")) {
              advanced.push({ focusMode: "continuous" });
            }
            // Skip forced zoom on Android — often selects a bad camera mode.
            if (!android && capabilities?.zoom && capabilities.zoom.max > capabilities.zoom.min) {
              const target = Math.min(
                capabilities.zoom.max,
                Math.max(
                  capabilities.zoom.min,
                  capabilities.zoom.min + (capabilities.zoom.max - capabilities.zoom.min) * 0.2
                )
              );
              advanced.push({ zoom: target });
            }
            if (advanced.length) {
              await track.applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] });
            }
          } catch {
            // Optional.
          }
        }

        rafId = window.requestAnimationFrame(() => {
          void decodeFrame();
        });
      } catch {
        if (!cancelled) {
          setError(
            android
              ? "Cannot open camera on Android Chrome. Allow camera permission, or use “Scan from photo” / type the tag ID."
              : "Hindi mabuksan ang camera. Please allow camera access."
          );
        }
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

  const scanImageFile = async (file: File) => {
    setPhotoBusy(true);
    setError("");
    setScanStatus("Reading QR from photo…");

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.floor(bitmap.width * scale));
      canvas.height = Math.max(1, Math.floor(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();

      const Detector = getBarcodeDetector();
      if (Detector) {
        const detector = new Detector({ formats: ["qr_code"] });
        const codes = await detector.detect(canvas);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          emitDetection(value);
          return;
        }
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const jsValue =
        jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" })
          ?.data?.trim() ||
        jsQR(invertImageData(imageData).data, imageData.width, imageData.height)?.data?.trim() ||
        null;
      if (jsValue) {
        emitDetection(jsValue);
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      const reader = new BrowserMultiFormatReader(hints);
      try {
        const result = reader.decodeFromCanvas(canvas);
        const value = result.getText().trim();
        if (value) {
          emitDetection(value);
          return;
        }
      } catch {
        // fall through
      }

      setScanStatus("No QR found in that photo. Try a closer shot, or type the tag ID.");
    } catch {
      setError("Could not read that photo. Try again or type the tag ID.");
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-farm-100 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          // contain keeps the decode crop aligned with what you see (critical on Android Chrome).
          className="aspect-[3/4] w-full bg-black object-contain"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[58%] max-h-[20rem] w-[72%] max-w-[20rem] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>
      <p className="text-xs text-slate-600">
        Tip: fill the square with the QR and hold steady. On Android, if live scan struggles, use{" "}
        <span className="font-semibold">Scan from photo</span> or type the tag ID.
      </p>
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void scanImageFile(file);
        }}
      />
      <button
        type="button"
        disabled={photoBusy}
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-xl bg-farm-100 px-4 py-3 text-base font-semibold text-farm-800 disabled:opacity-60"
      >
        {photoBusy ? "Reading photo…" : "Scan from photo"}
      </button>
      <p className="rounded-lg bg-white p-3 text-sm">{scanStatus}</p>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

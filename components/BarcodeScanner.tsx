"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (value: string) => void;
};

export default function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const pickPreferredCamera = (cameras: MediaDeviceInfo[]) => {
    const rearCamera = cameras.find((device) =>
      /(back|rear|environment|world)/i.test(device.label)
    );
    return rearCamera || cameras[cameras.length - 1] || cameras[0];
  };

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    let activeControls: { stop: () => void } | null = null;

    const start = async () => {
      try {
        const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(videoDevices);

        const preferredDeviceId =
          selectedDeviceId || pickPreferredCamera(videoDevices)?.deviceId || "";

        if (!selectedDeviceId && preferredDeviceId) {
          setSelectedDeviceId(preferredDeviceId);
          return;
        }

        if (!videoRef.current) return;

        activeControls = await reader.decodeFromVideoDevice(
          preferredDeviceId || undefined,
          videoRef.current,
          (result) => {
            if (result) {
              onDetected(result.getText());
            }
          }
        );
      } catch {
        setError("Hindi mabuksan ang camera. Please allow camera access.");
      }
    };

    void start();

    return () => {
      activeControls?.stop();
    };
  }, [onDetected, selectedDeviceId]);

  const toggleTorch = async () => {
    const track = videoRef.current?.srcObject instanceof MediaStream
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
      <video ref={videoRef} className="w-full rounded-2xl border border-farm-100 bg-black" />
      <button
        onClick={switchCamera}
        disabled={devices.length <= 1}
        className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        Switch Camera
      </button>
      <button
        onClick={toggleTorch}
        className="w-full rounded-xl bg-farm-600 px-4 py-3 text-base font-semibold text-white"
      >
        {torchEnabled ? "Turn Torch Off" : "Turn Torch On"}
      </button>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

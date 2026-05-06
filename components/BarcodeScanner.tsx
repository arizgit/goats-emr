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

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();

    let activeControls: { stop: () => void } | null = null;

    const start = async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices[0]?.deviceId;
        if (!videoRef.current) return;

        activeControls = await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
          if (result) {
            onDetected(result.getText());
          }
        });
      } catch {
        setError("Hindi mabuksan ang camera. Please allow camera access.");
      }
    };

    void start();

    return () => {
      activeControls?.stop();
    };
  }, [onDetected]);

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

  return (
    <div className="space-y-3">
      <video ref={videoRef} className="w-full rounded-2xl border border-farm-100 bg-black" />
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

"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  height?: number;
  barWidth?: number;
  fontSize?: number;
  className?: string;
};

export default function TagBarcode({
  value,
  height = 64,
  barWidth = 2,
  fontSize = 16,
  className
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value.trim()) return;

    try {
      JsBarcode(svgRef.current, value.trim(), {
        format: "CODE128",
        displayValue: true,
        fontSize,
        height,
        width: barWidth,
        margin: 8,
        background: "#ffffff",
        lineColor: "#000000",
        textMargin: 4
      });
    } catch {
      // Invalid barcode value for CODE128 — leave SVG empty.
      svgRef.current.innerHTML = "";
    }
  }, [value, height, barWidth, fontSize]);

  if (!value.trim()) return null;

  return <svg ref={svgRef} className={className} role="img" aria-label={`Barcode ${value}`} />;
}

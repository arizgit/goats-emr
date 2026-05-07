import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

/** Base64 data URLs need unoptimized mode; HTTPS blob URLs can use the image optimizer. */
export default function GoatImage({ src, alt, width, height, className }: Props) {
  const unoptimized = src.startsWith("data:");

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={className}
    />
  );
}

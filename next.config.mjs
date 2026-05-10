/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["googleapis", "gaxios"]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**"
      }
    ]
  }
};

export default nextConfig;

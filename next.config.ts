import type { NextConfig } from "next";

/**
 * When you open the dev app via a LAN IP (e.g. http://192.168.1.9:3000),
 * Next.js must allow that origin for the HMR WebSocket (_next/webpack-hmr).
 * Without this, the console shows WebSocket errors and Fast Refresh can break
 * client state when you click buttons (e.g. Easy / Medium / Hard).
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.9",
    ...(process.env.DEV_LAN_HOST ? [process.env.DEV_LAN_HOST] : []),
  ],
};

export default nextConfig;

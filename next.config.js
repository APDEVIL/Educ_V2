/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // ✅ allows any external image URL (thumbnails from any host)
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default config;
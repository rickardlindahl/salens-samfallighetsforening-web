import { withPayload } from "@payloadcms/next/withPayload";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  experimental: {
    reactCompiler: false,
  },
  async rewrites() {
    return [
      {
        source: "/js/script.js",
        destination: "https://analytics.lindahl.app/js/script.js",
      },
      {
        source: "/api/event", // Or '/api/event/' if you have `trailingSlash: true` in this config
        destination: "https://analytics.lindahl.app/api/event",
      },
    ];
  },
};

export default withPayload(nextConfig);

import { withPayload } from "@payloadcms/next/withPayload";
import { withPlausibleProxy } from "next-plausible";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  experimental: {
    reactCompiler: false,
  },
};

export default withPayload(
  withPlausibleProxy({ customDomain: "https://analytics.lindahl.app" })(
    nextConfig,
  ),
);

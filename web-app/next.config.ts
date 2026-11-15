import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    // The managed build runner cannot allocate piped descriptors for Next's
    // child `tsc --showConfig` process. Use the installed compiler API instead.
    useTypeScriptCli: false,
  },
};

export default nextConfig;

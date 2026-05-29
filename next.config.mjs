/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app is iframe-compatible by default: we intentionally do NOT set
  // X-Frame-Options, and use a permissive frame-ancestors CSP so it can be
  // embedded on any host (e.g. an LMS, marketing site, or course platform).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@glorbit/shared"],
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_GLORBIT_API ?? "http://127.0.0.1:4317";
    return [
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
      { source: "/ws/:path*", destination: `${backend}/ws/:path*` },
    ];
  },
};

export default nextConfig;

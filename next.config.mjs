/** @type {import('next').NextConfig} */
/** Keep the dev server cache separate from production builds. */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;

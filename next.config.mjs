/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Evita que Next.js compile pdf-parse como ESM (no tiene exportación por defecto)
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;

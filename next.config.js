/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  // Asegurar que nodemailer y pdfkit se usen solo en el servidor
  serverComponentsExternalPackages: ['nodemailer', 'pdfkit', 'jspdf'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configurar webpack para manejar PDFKit en el servidor
      config.externals = [...(config.externals || []), 'canvas', 'utf-8-validate', 'bufferutil']
    }
    // Manejar archivos estáticos de PDFKit
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }
    return config
  },
}

module.exports = nextConfig

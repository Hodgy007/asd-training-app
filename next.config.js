/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'via.placeholder.com' },
      { hostname: 'placehold.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), fullscreen=*',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Stripe: js.stripe.com serves Stripe.js + Checkout + Billing Portal scripts.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              // fonts.googleapis.com — Google Fonts stylesheets (Lexend).
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://via.placeholder.com https://placehold.co https://*.public.blob.vercel-storage.com https://*.stripe.com",
              // fonts.gstatic.com — Google Fonts font binaries.
              "font-src 'self' https://fonts.gstatic.com",
              // *.public.blob.vercel-storage.com — direct browser uploads to
              // Vercel Blob (used by the SCORM import modal which bypasses the
              // 4.5 MB serverless body limit by uploading client-side).
              "connect-src 'self' https://generativelanguage.googleapis.com https://api.stripe.com https://blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
              // blob: — URL.createObjectURL() results used by the TTS player's
              // <audio> element. Without this, the browser silently rejects
              // blob URLs as "no supported source was found".
              "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
              "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

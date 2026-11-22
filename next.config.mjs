/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = null;
if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHostname = null;
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https',
              hostname: supabaseHostname,
              pathname: '/storage/v1/object/public/avatars/**',
            },
          ]
        : []),
    ],
  },
  async redirects() {
    return [
      {
        source: '/images/hero1.jfif',
        destination: '/images/hero1.jpg',
        permanent: true,
      },
      {
        source: '/images/auth/signup.jfif',
        destination: '/images/auth/signup.jpg',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.cache = false;
    config.parallelism = 1;
    return config;
  },
};

export default nextConfig;

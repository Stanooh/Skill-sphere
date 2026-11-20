/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

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
  webpack: (config) => {
    config.cache = false;
    config.parallelism = 1;
    return config;
  },
};

export default nextConfig;

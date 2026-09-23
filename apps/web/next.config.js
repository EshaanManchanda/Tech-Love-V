/** @type {import('next').NextConfig} */
const nextConfig = {
  // Installed plugin builds still link to {license_server}/pricing — keep that working.
  async redirects() {
    return [{ source: "/pricing", destination: "/certificate-generator/pricing", permanent: true }];
  },
};

module.exports = nextConfig;

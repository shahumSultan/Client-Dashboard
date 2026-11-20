import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // The Users page is gone: team accounts are managed on Company -> Team,
      // client accounts on each client's page. Old links still land.
      { source: "/admin/users", destination: "/admin/company?tab=team", permanent: false },
    ];
  },
};

export default nextConfig;

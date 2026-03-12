const nextConfig = {
  ...(process.env.NEXT_OUTPUT_EXPORT === "true"
    ? {
        output: "export",
      }
    : {}),
  ...(process.env.NODE_ENV === "production"
    ? {
        basePath: "/chargenext",
        assetPrefix: "/chargenext/",
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

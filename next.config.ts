const nextConfig = {
  ...(process.env.NEXT_OUTPUT_EXPORT === "true"
    ? {
        output: "export",
      }
    : {}),
  ...(process.env.NODE_ENV === "production"
    ? {
        basePath: "/icomputer-dispatch-platform",
        assetPrefix: "/icomputer-dispatch-platform/",
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

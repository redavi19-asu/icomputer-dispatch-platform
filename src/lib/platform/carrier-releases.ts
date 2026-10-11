export const CARRIER_RELEASE_API = "https://api.github.com/repos/redavi19-asu/icomputer-dispatch-platform/releases/tags/carrier-desktop-production";
const BASE = "https://github.com/redavi19-asu/icomputer-dispatch-platform/releases/download/carrier-desktop-production/";
const names = {
  windows: "Urban-Carrier-Windows-x64.exe",
  macArm: "Urban-Carrier-macOS-Apple-Silicon.dmg",
  macIntel: "Urban-Carrier-macOS-Intel.dmg",
} as const;
export type CarrierReleases = Partial<Record<keyof typeof names, string>>;

export function verifiedReleaseLinks(release: unknown): CarrierReleases {
  if (!release || typeof release !== "object") return {};
  const data = release as { draft?: boolean; prerelease?: boolean; tag_name?: string; assets?: Array<{ name?: string; size?: number; state?: string }> };
  if (data.draft || data.prerelease || data.tag_name !== "carrier-desktop-production" || !Array.isArray(data.assets)) return {};
  const links: CarrierReleases = {};
  for (const [platform, name] of Object.entries(names)) {
    if (data.assets.some(asset => asset.name === name && asset.state === "uploaded" && Number(asset.size) > 0)) {
      links[platform as keyof typeof names] = BASE + name;
    }
  }
  return links;
}

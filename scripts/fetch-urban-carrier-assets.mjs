import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const VERSION = "urban-carrier-kenney-v1-2026-10-04";
const ROOT = resolve("public/models/urban-carrier");
const MARKER = join(ROOT, ".asset-version");

const packs = [
  {
    name: "people",
    url: "https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip",
    files: [
      ["Models/GLB format/character-female-a.glb", "people/character-female-a.glb"],
      ["Models/GLB format/character-female-b.glb", "people/character-female-b.glb"],
      ["Models/GLB format/character-male-a.glb", "people/character-male-a.glb"],
      ["Models/GLB format/character-male-e.glb", "people/character-male-e.glb"],
      ["Models/GLB format/Textures/colormap.png", "people/Textures/colormap.png"],
      ["License.txt", "people/License.txt"],
    ],
  },
  {
    name: "cars",
    url: "https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip",
    files: [
      ["Models/GLB format/delivery.glb", "cars/delivery.glb"],
      ["Models/GLB format/sedan.glb", "cars/sedan.glb"],
      ["Models/GLB format/suv.glb", "cars/suv.glb"],
      ["Models/GLB format/Textures/colormap.png", "cars/Textures/colormap.png"],
      ["License.txt", "cars/License.txt"],
    ],
  },
  {
    name: "city",
    url: "https://kenney.nl/media/pages/assets/city-kit-suburban/2c871b7af2-1745479373/kenney_city-kit-suburban_20.zip",
    files: [
      ["Models/GLB format/building-type-h.glb", "city/building-type-h.glb"],
      ["Models/GLB format/building-type-l.glb", "city/building-type-l.glb"],
      ["Models/GLB format/building-type-p.glb", "city/building-type-p.glb"],
      ["Models/GLB format/tree-large.glb", "city/tree-large.glb"],
      ["Models/GLB format/Textures/colormap.png", "city/Textures/colormap.png"],
      ["License.txt", "city/License.txt"],
    ],
  },
];

const required = packs.flatMap((pack) => pack.files.map(([, dest]) => join(ROOT, dest)));

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isCurrent() {
  try {
    const marker = (await readFile(MARKER, "utf8")).trim();
    if (marker !== VERSION) return false;
    const checks = await Promise.all(required.map(exists));
    return checks.every(Boolean);
  } catch {
    return false;
  }
}

function extract(zipPath, entry) {
  const result = spawnSync("unzip", ["-p", zipPath, entry], {
    encoding: null,
    maxBuffer: 4 * 1024 * 1024,
  });

  if (result.status !== 0 || !result.stdout?.length) {
    const stderr = result.stderr?.toString("utf8") || "unknown unzip error";
    throw new Error(`Unable to extract ${entry}: ${stderr}`);
  }

  return result.stdout;
}

async function download(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "UrbanCarrierOS/1.0 (+https://icomputeranything.com)",
      Accept: "application/zip,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Asset download failed (${response.status}) for ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

if (await isCurrent()) {
  console.log("Urban Carrier 3D assets already prepared.");
  process.exit(0);
}

await mkdir(ROOT, { recursive: true });
const tempRoot = await mkdtemp(join(tmpdir(), "urban-carrier-assets-"));

try {
  for (const pack of packs) {
    console.log(`Fetching ${pack.name} 3D assets...`);
    const zipBytes = await download(pack.url);
    const zipPath = join(tempRoot, `${pack.name}.zip`);
    await writeFile(zipPath, zipBytes);

    for (const [entry, destination] of pack.files) {
      const target = join(ROOT, destination);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, extract(zipPath, entry));
    }
  }

  await writeFile(
    join(ROOT, "README.txt"),
    [
      "Urban Carrier OS 3D scene assets",
      "",
      "Source: Kenney.nl",
      "Packs: Mini Characters, Car Kit, City Kit (Suburban)",
      "License: Creative Commons Zero (CC0 1.0)",
      "The original License.txt from each pack is included beside the extracted assets.",
      "",
      "Urban Carrier-specific orange backpacks and scene choreography are implemented by I Computer Anything.",
      "",
    ].join("\n"),
    "utf8",
  );
  await writeFile(MARKER, VERSION + "\n", "utf8");
  console.log("Urban Carrier 3D assets prepared.");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const BG = "#F5F4F0";
const FG = "#1C1C1A";

function svg(size) {
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.46);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <text x="50%" y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-weight="800"
        font-size="${fontSize}"
        letter-spacing="-${Math.round(size * 0.01)}"
        fill="${FG}">Kith</text>
</svg>`;
}

async function render(size, outName) {
  const buf = Buffer.from(svg(size));
  const png = await sharp(buf).png().toBuffer();
  const out = join(publicDir, outName);
  await writeFile(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}

await render(192, "icon-192.png");
await render(512, "icon-512.png");

import { BROWSER_ICONS } from "./browser-icons.generated.js";

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function handleBrowserIcon(pathname) {
  const asset = BROWSER_ICONS[pathname];
  if (!asset) return null;
  return new Response(decodeBase64(asset.base64), {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

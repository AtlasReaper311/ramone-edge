import { RAMONE_INTERFACE_FONT_ASSETS } from "./interface-bundle.generated.js";

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function handleInterfaceAsset(pathname) {
  const asset = RAMONE_INTERFACE_FONT_ASSETS[pathname];
  if (!asset) return null;
  return new Response(decodeBase64(asset.base64), {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-atlas-interface-sha256": asset.sha256,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function captureVisibleTab(quality: number): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab(undefined as unknown as number, {
    format: "jpeg",
    quality,
  });
  return dataUrl;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match || !match[2]) {
    throw new Error("Invalid data URL");
  }

  const mime = match[1];
  const byteString = atob(match[2]);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

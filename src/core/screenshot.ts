let nextCaptureTime = 0;

export async function captureVisibleTab(
  quality: number,
  windowId?: number,
): Promise<string> {
  const now = Date.now();
  const scheduled = Math.max(now, nextCaptureTime);
  nextCaptureTime = scheduled + 550;
  if (scheduled > now)
    await new Promise((resolve) => setTimeout(resolve, scheduled - now));
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId as number, {
    format: "jpeg",
    quality,
  });
  return dataUrl;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match?.[2]) {
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

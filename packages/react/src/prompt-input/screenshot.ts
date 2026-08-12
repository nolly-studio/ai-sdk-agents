/**
 * Capture the current display via getDisplayMedia and return a PNG File.
 * Returns null when the API is unavailable or the user cancels.
 */
function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  // canvas.toBlob is callback-only; no Promise-returning browser API exists.
  // oxlint-disable-next-line promise/avoid-new -- toBlob callback bridge
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
}

async function captureScreenshot(): Promise<File | null> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getDisplayMedia
  ) {
    return null;
  }

  let stream: MediaStream | null = null;
  const video = document.createElement("video");

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });
    video.srcObject = stream;
    video.muted = true;
    await video.play();

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!(width && height)) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await canvasToPngBlob(canvas);
    if (!blob) {
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replaceAll(/[:.]/gu, "-")
      .replace("T", "_")
      .replace("Z", "");

    return new File([blob], `screenshot-${timestamp}.png`, {
      lastModified: Date.now(),
      type: "image/png",
    });
  } catch {
    return null;
  } finally {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    video.pause();
    video.srcObject = null;
  }
}

export { captureScreenshot };

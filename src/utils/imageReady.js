function hasDecodedPixels(image) {
  return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
}

function waitForLoad(image) {
  if (image.complete) {
    return hasDecodedPixels(image)
      ? Promise.resolve()
      : Promise.reject(
          new Error(`Image failed to load: ${image.currentSrc || image.src}`),
        );
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(
        new Error(`Image failed to load: ${image.currentSrc || image.src}`),
      );
    };
    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
  });
}

/**
 * Resolves only after an image has loaded and is ready to paint. Safari can
 * reject decode() for an otherwise complete image, so loaded pixel dimensions
 * remain the final source of truth.
 */
export async function waitForDecodedImage(image) {
  if (!image) throw new Error("Required image element is missing");

  if (typeof image.decode === "function") {
    try {
      await image.decode();
    } catch (decodeError) {
      if (!hasDecodedPixels(image)) {
        try {
          await waitForLoad(image);
        } catch {
          throw decodeError;
        }
      }
    }
  } else await waitForLoad(image);

  if (!hasDecodedPixels(image)) {
    throw new Error(`Image did not decode: ${image.currentSrc || image.src}`);
  }
  return image;
}

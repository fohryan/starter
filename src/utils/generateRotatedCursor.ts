export async function generateRotatedCursor(angle: number): Promise<string> {
  const response = await fetch('/rotate.svg');
  const svgText = await response.text();

  // Create a blob from the SVG
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  // Load into an Image object
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return 'auto';

  const size = 32;
  canvas.width = size;
  canvas.height = size;

  return new Promise((resolve) => {
    img.onload = () => {
      // Clear + rotate
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      resolve(`url(${dataUrl}) 16 16, auto`);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

import QRCode from 'qrcode';

const DARK = '#16161A';
const LIGHT = '#FFFFFF';

/** Inline SVG used by the preview panels. */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    color: { dark: DARK, light: LIGHT },
  });
}

/**
 * PNG export: 1024px QR code on a white canvas with the class title beneath.
 * The QR itself keeps a white quiet zone (margin), and the finished image is
 * 1200px wide so it stays sharp in print.
 */
export async function downloadQrPng(text: string, title: string, fileName: string): Promise<void> {
  const qrSize = 1024;
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, text, {
    width: qrSize,
    margin: 4,
    color: { dark: DARK, light: LIGHT },
  });

  const padding = 88;
  const titleHeight = 132;
  const output = document.createElement('canvas');
  output.width = qrSize + padding * 2;
  output.height = qrSize + padding + titleHeight;
  const context = output.getContext('2d');
  if (!context) throw new Error('Could not create the QR image.');

  context.fillStyle = LIGHT;
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(canvas, padding, padding, qrSize, qrSize);

  const label = (title.trim() || 'My class').replace(/\s+/g, ' ');
  context.fillStyle = DARK;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  let fontSize = 42;
  context.font = `700 ${fontSize}px 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif`;
  while (context.measureText(label).width > output.width - padding * 2 && fontSize > 22) {
    fontSize -= 2;
    context.font = `700 ${fontSize}px 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif`;
  }
  context.fillText(label, output.width / 2, qrSize + padding + titleHeight / 2, output.width - padding * 2);

  const dataUrl = output.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

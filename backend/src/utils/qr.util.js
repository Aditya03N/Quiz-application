import QRCode from 'qrcode';

export async function generateQrDataUrl(link) {
  try {
    return await QRCode.toDataURL(link, { margin: 2, width: 280 });
  } catch (error) {
    console.error('QR generation failed', error);
    return '';
  }
}

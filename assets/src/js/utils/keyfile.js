export async function readKeyfileAsHex(file) {
  if (!file) throw new Error('no file');
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (bytes.length === 0 || bytes.length > 1024) {
    throw new Error('invalid keyfile');
  }
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function downloadKeyfile(hex, username) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `banter-${username || 'account'}.keyfile`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
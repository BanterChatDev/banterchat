import { u } from '../api/routes';

export function attachmentPageUrl(id) {
  return u.attachmentView(id);
}

export function attachmentRawUrl(id) {
  return u.attachment(id);
}

const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'ogv', '3gp'];
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'opus', 'aac'];
const TEXT_EXTS = ['js','jsx','ts','tsx','go','py','rb','rs','c','cpp','cc','h','hpp','java','kt','swift','php','sh','bash','zsh','fish','css','scss','sass','less','html','htm','xml','json','yaml','yml','toml','ini','conf','env','sql','lua','zig','txt','md','markdown','log','diff','patch','gitignore','dockerfile','makefile','rst','tex','csv','tsv'];

function ext(att) {
  const name = att?.filename || '';
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

export function isImageAttachment(att) {
  if (att?.mime_type?.startsWith('image/')) return true;
  return IMAGE_EXTS.includes(ext(att));
}

export function isVideoAttachment(att) {
  const mime = att?.mime_type || '';
  if (mime.startsWith('video/')) return true;
  if (mime.startsWith('audio/') || mime.startsWith('image/')) return false;
  return VIDEO_EXTS.includes(ext(att));
}

export function isAudioAttachment(att) {
  const mime = att?.mime_type || '';
  if (mime.startsWith('audio/')) return true;
  if (mime.startsWith('video/') || mime.startsWith('image/')) return false;
  return AUDIO_EXTS.includes(ext(att));
}

export function isTextAttachment(att) {
  const m = att?.mime_type;
  if (m?.startsWith('text/')) return true;
  return TEXT_EXTS.includes(ext(att));
}

export function isVoiceAttachment(att) {
  if (!att) return false;
  return Number(att.duration_secs) > 0 && typeof att.waveform === 'string' && att.waveform.length > 0;
}

export function isMediaAttachment(att) {
  return isImageAttachment(att) || isVideoAttachment(att) || isAudioAttachment(att);
}
export function isPeerSpeaking(peer, speakingByUserId) {
  if (!peer || !speakingByUserId) return false;
  return !!speakingByUserId[peer.user_id] && !peer.muted && !peer.force_muted;
}
import React from 'react';
import ImagePreview from '../media/imagePreview';
import VideoPlayer from '../media/VideoPlayer';
import AudioPlayer from '../media/AudioPlayer';
import VoicePlayer from '../voicemessage/VoicePlayer';
import FilePreview from '../media/FilePreview';
import {
  attachmentRawUrl,
  isAudioAttachment,
  isImageAttachment,
  isTextAttachment,
  isVideoAttachment,
  isVoiceAttachment,
} from '../../utils/attachments';

function AttachmentView({ attachments }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-1 flex flex-col gap-1">
      {attachments.map(att => {
        const rawUrl = attachmentRawUrl(att.id);
        if (isVoiceAttachment(att)) {
          return (
            <div key={att.id}>
              <VoicePlayer
                src={rawUrl}
                waveform={att.waveform}
                durationSecs={Number(att.duration_secs) || 0}
                filename={att.filename}
              />
            </div>
          );
        }
        if (isImageAttachment(att)) {
          return (
            <div key={att.id} className="max-w-xs">
              <ImagePreview src={rawUrl} alt={att.filename} width={att.width} height={att.height} />
            </div>
          );
        }
        if (isVideoAttachment(att)) {
          return (
            <div key={att.id} className="max-w-md">
              <VideoPlayer src={rawUrl} filename={att.filename} />
            </div>
          );
        }
        if (isAudioAttachment(att)) {
          return (
            <div key={att.id}>
              <AudioPlayer
                src={rawUrl}
                filename={att.filename}
                waveform={att.waveform || ''}
                durationSecs={Number(att.duration_secs) || 0}
              />
            </div>
          );
        }
        return (
          <div key={att.id}>
            <FilePreview
              src={rawUrl}
              filename={att.filename}
              size={att.size}
              isText={isTextAttachment(att)}
            />
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(AttachmentView);
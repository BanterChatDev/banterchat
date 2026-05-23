import React from 'react';
import DropdownMenu, { DropdownItem } from '../ui/DropdownMenu';
import { DocumentIcon, MicOnIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function AttachMenu({ anchorRef, onUpload, onVoice, onGif, onClose, canVoice = true }) {
  const t = useT();
  const pick = (fn) => () => { onClose(); fn(); };
  return (
    <DropdownMenu anchorRef={anchorRef} onClose={onClose} width={200} align="left" className="py-1">
      <DropdownItem
        icon={<DocumentIcon className="w-4 h-4 text-white/55" />}
        label={t('messages.input_attach_file')}
        onClick={pick(onUpload)}
      />
      {canVoice && (
        <DropdownItem
          icon={<MicOnIcon className="w-4 h-4 text-white/55" />}
          label={t('messages.input_record_voice')}
          onClick={pick(onVoice)}
        />
      )}
      {onGif && (
        <DropdownItem
          icon={<span className="text-[10px] font-bold tracking-wider text-white/55">GIF</span>}
          label="GIF"
          onClick={pick(onGif)}
        />
      )}
    </DropdownMenu>
  );
}
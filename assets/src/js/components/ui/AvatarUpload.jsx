import React from 'react';
import ImageUploadArea from './ImageUploadArea';
import CropModal from './CropModal';

export default function AvatarUpload({ img, hasImage, previewEl, wrapperClass = '', disabled = false }) {
  if (disabled) return previewEl;
  return (
    <>
      <div className={`overflow-hidden flex-shrink-0 ${wrapperClass}`}>
        <ImageUploadArea
          uploading={img.uploading}
          dragging={img.drag.dragging}
          dragProps={img.drag.dragProps}
          onClick={() => img.fileRef.current?.click()}
          onRemove={hasImage ? img.handleRemove : null}
          hasImage={hasImage}
        >
          {previewEl}
          <input
            ref={img.fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              img.processFile(e.target.files?.[0]);
              if (img.fileRef.current) img.fileRef.current.value = '';
            }}
          />
        </ImageUploadArea>
      </div>
      {img.cropFile && (
        <CropModal
          file={img.cropFile}
          aspect={img.cropAspect}
          onCrop={img.handleCropped}
          onClose={img.clearCrop}
        />
      )}
      {img.error && <p className="text-[11px] text-red-400 mt-2">{img.error}</p>}
    </>
  );
}
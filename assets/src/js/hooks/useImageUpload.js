import { useState, useRef, useCallback } from 'react';
import useDragDrop from './useDragDrop';
import { t as tBare } from '../lang/apply';
import { cropToAspect, isAnimatedFile } from '../utils/cropImage';

export function useImageUpload(config) {
  const {
    maxSize = 5 * 1024 * 1024,
    aspect = 1,
    applyCrop = false,
    cropTargetLongEdge = 512,
    upload,
    remove,
    onUpload,
    onRemove,
  } = config;

  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const fileRef = useRef(null);

  const validate = useCallback((file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (file.type && !allowed.includes(file.type)) return tBare('messages.input_warn_image_type');
    if (file.size > maxSize) return tBare('messages.input_warn_image_too_large_template').replace('{mb}', maxSize / 1024 / 1024);
    return null;
  }, [maxSize]);

  const doUpload = useCallback(async (file, crop) => {
    setUploading(true);
    try {
      const res = await upload(file, crop);
      if (onUpload) onUpload(res);
      return true;
    } catch (err) {
      setError(err.message || tBare('messages.input_warn_upload_failed'));
      return false;
    } finally {
      setUploading(false);
    }
  }, [upload, onUpload]);

  const processFile = useCallback(async (file) => {
    if (!file) return;
    const msg = validate(file);
    if (msg) { setError(msg); return; }
    setError('');
    if (applyCrop && await isAnimatedFile(file)) {
      doUpload(file, null);
      return;
    }
    setCropFile(file);
  }, [validate, applyCrop, doUpload]);

  const handleCropped = useCallback(async (file, crop) => {
    setCropFile(null);
    if (applyCrop) {
      try {
        const cropped = await cropToAspect(file, crop, aspect, cropTargetLongEdge);
        return doUpload(cropped, null);
      } catch {
        setError(tBare('messages.input_warn_upload_failed'));
        return false;
      }
    }
    return doUpload(file, crop);
  }, [doUpload, applyCrop, aspect, cropTargetLongEdge]);

  const clearCrop = useCallback(() => setCropFile(null), []);

  const handleRemove = useCallback(async () => {
    setError('');
    setUploading(true);
    try {
      await remove();
      if (onRemove) onRemove();
    } catch (err) {
      setError(err.message || tBare('messages.input_warn_remove_failed'));
    } finally {
      setUploading(false);
    }
  }, [remove, onRemove]);

  const drag = useDragDrop(useCallback((files) => processFile(files[0]), [processFile]));

  return {
    error,
    uploading,
    cropFile,
    cropAspect: aspect,
    fileRef,
    drag,
    processFile,
    handleCropped,
    clearCrop,
    handleRemove,
  };
}
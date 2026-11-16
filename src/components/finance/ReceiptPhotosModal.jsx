import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import BaseModal from '../ui/BaseModal';
import AlertBanner from '../ui/AlertBanner';
import AttachmentThumb from './AttachmentThumb';
import { financeCopy } from '../../i18n/finance';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { RECEIPT_ACCEPT, prepareReceiptFile, readAttachments, receiptLimits } from '../../lib/receiptAttachments';
import { formatPhotoSize } from '../../lib/animalPhoto';
import { useEntitlements } from '../../hooks/useEntitlements';

/**
 * Receipt photos kept with one ledger entry: see them, and add more (up to the
 * backend's limit). `onUploaded` refreshes the ledger so the row's count updates.
 */
export default function ReceiptPhotosModal({ transaction, title, canUpload, onClose, onUploaded }) {
  const copy = financeCopy.receiptPhotos;
  const queryClient = useQueryClient();
  const cameraInput = useRef(null);
  const fileInput = useRef(null);
  // Uploaded in this session, shown at once while the ledger refreshes.
  const [added, setAdded] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);

  const known = readAttachments(transaction);
  const attachments = [...known, ...added.filter((item) => !known.some((existing) => existing.id === item.id))];
  const entitlements = useEntitlements();
  const { maxBytes, maxPerEntry } = receiptLimits(entitlements);
  const isFull = attachments.length >= maxPerEntry;

  const upload = useMutation({
    mutationFn: (file) => financeApi.uploadAttachment(transaction.id, file, { onProgress: setProgress }),
    onSuccess: (attachment) => {
      setAdded((current) => [...current, attachment]);
      onUploaded?.();
    },
    onError: (uploadError) => setError(uploadError?.response
      ? getApiErrorMessage(uploadError, copy.notSaved)
      : copy.offline),
    onSettled: () => setProgress(null),
  });

  const handleFile = async (event) => {
    const [picked] = event.target.files ?? [];
    event.target.value = '';
    if (!picked) return;
    setError('');
    const { file, error: fileError } = await prepareReceiptFile(picked, { maxBytes });
    if (fileError) {
      setError(fileError);
      return;
    }
    upload.mutate(file);
  };

  const close = () => {
    queryClient.removeQueries({ queryKey: ['ledger-attachment'], type: 'inactive' });
    onClose();
  };

  return (
    <BaseModal isOpen onClose={close} title={copy.title} subtitle={title}>
      <div className="space-y-4">
        {error && <AlertBanner type="danger" message={error} compact />}
        {attachments.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.empty}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {attachments.map((attachment) => <li key={attachment.id}><AttachmentThumb attachment={attachment} /></li>)}
          </ul>
        )}

        {canUpload && (
          isFull ? (
            <p className="text-xs text-ink-muted">{copy.full(maxPerEntry)}</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => cameraInput.current?.click()} disabled={upload.isPending} className="btn-command text-sm">

    {copy.takePhoto}
                </button>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={upload.isPending} className="btn-secondary text-sm">

    {copy.choose}
                </button>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <input ref={fileInput} type="file" accept={RECEIPT_ACCEPT} onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <p className="text-xs text-ink-muted" role="status">
                {upload.isPending
                  ? copy.uploading(progress)
                  : copy.hint(maxPerEntry, formatPhotoSize(maxBytes))}
              </p>
            </div>
          )
        )}
      </div>
    </BaseModal>
  );
}

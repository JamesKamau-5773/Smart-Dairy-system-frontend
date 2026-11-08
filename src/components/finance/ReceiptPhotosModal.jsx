import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Paperclip } from 'lucide-react';
import BaseModal from '../ui/BaseModal';
import AlertBanner from '../ui/AlertBanner';
import AttachmentThumb from './AttachmentThumb';
import { financeApi, getApiErrorMessage } from '../../lib/backendApi';
import { RECEIPT_ACCEPT, RECEIPT_MAX_PER_ENTRY, prepareReceiptFile, readAttachments } from '../../lib/receiptAttachments';

/**
 * Receipt photos kept with one ledger entry: see them, and add more (up to the
 * backend's limit). `onUploaded` refreshes the ledger so the row's count updates.
 */
export default function ReceiptPhotosModal({ transaction, title, canUpload, onClose, onUploaded }) {
  const queryClient = useQueryClient();
  const cameraInput = useRef(null);
  const fileInput = useRef(null);
  // Uploaded in this session, shown at once while the ledger refreshes.
  const [added, setAdded] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);

  const known = readAttachments(transaction);
  const attachments = [...known, ...added.filter((item) => !known.some((existing) => existing.id === item.id))];
  const isFull = attachments.length >= RECEIPT_MAX_PER_ENTRY;

  const upload = useMutation({
    mutationFn: (file) => financeApi.uploadAttachment(transaction.id, file, { onProgress: setProgress }),
    onSuccess: (attachment) => {
      setAdded((current) => [...current, attachment]);
      onUploaded?.();
    },
    onError: (uploadError) => setError(uploadError?.response
      ? getApiErrorMessage(uploadError, 'The receipt was not saved. Try again.')
      : 'No internet connection. The receipt was not saved.'),
    onSettled: () => setProgress(null),
  });

  const handleFile = async (event) => {
    const [picked] = event.target.files ?? [];
    event.target.value = '';
    if (!picked) return;
    setError('');
    const { file, error: fileError } = await prepareReceiptFile(picked);
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
    <BaseModal isOpen onClose={close} title="Receipt photos" subtitle={title}>
      <div className="space-y-4">
        {error && <AlertBanner type="danger" message={error} compact />}
        {attachments.length === 0 ? (
          <p className="text-sm text-ink-muted">No receipt photos yet. Add a photo of the paper receipt or invoice so you can find it later.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {attachments.map((attachment) => <li key={attachment.id}><AttachmentThumb attachment={attachment} /></li>)}
          </ul>
        )}

        {canUpload && (
          isFull ? (
            <p className="text-xs text-ink-muted">This entry has the most receipts it can hold ({RECEIPT_MAX_PER_ENTRY}).</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => cameraInput.current?.click()} disabled={upload.isPending} className="btn-command gap-2 text-sm">
                  <Camera size={16} aria-hidden="true" /> Take photo
                </button>
                <button type="button" onClick={() => fileInput.current?.click()} disabled={upload.isPending} className="btn-secondary gap-2 text-sm">
                  <Paperclip size={16} aria-hidden="true" /> Choose photo or PDF
                </button>
              </div>
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <input ref={fileInput} type="file" accept={RECEIPT_ACCEPT} onChange={handleFile} className="sr-only" tabIndex={-1} aria-hidden="true" />
              <p className="text-xs text-ink-muted" role="status">
                {upload.isPending
                  ? `Uploading${progress !== null ? ` ${progress}%` : '…'}`
                  : `Photos are shrunk on this phone to save data. Up to ${RECEIPT_MAX_PER_ENTRY} per entry, 4 MB each.`}
              </p>
            </div>
          )
        )}
      </div>
    </BaseModal>
  );
}

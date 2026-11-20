import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { financeApi, getApiErrorMessage } from '../lib/backendApi';
import { offlineFailureMessage } from '../lib/offlinePolicy';
import { correctionKind } from '../lib/ledgerCorrection';
import { readAttachments } from '../lib/receiptAttachments';
import { canSharePdf, downloadReceiptPdf, shareReceipt as sendReceipt } from '../lib/receipt';
import { hasRole } from '../lib/roles';
import { useAuth } from '../contexts/AuthContext';
import { useInvalidateLedger } from './usePeriodTotals';
import { financeCopy } from '../i18n/finance';

/**
 * What can be done to one ledger record (correct it, view its receipt, add photos), and the
 * state of the dialogs that do it. The page renders the dialogs; the table gets `menuItemsFor`
 * and `openReceipt`.
 */
export function useLedgerRecordActions() {
  const copy = financeCopy.ledger;
  const { currentUser } = useAuth();
  const invalidateLedger = useInvalidateLedger();
  const [receipt, setReceipt] = useState(null);
  const [isReceiptDownloading, setIsReceiptDownloading] = useState(false);
  const [isReceiptSharing, setIsReceiptSharing] = useState(false);
  // The open receipt's PDF, fetched once for Download and Share.
  const receiptPdf = useRef({ id: null, blob: null });
  const [toCorrect, setToCorrect] = useState(null);
  const [photosFor, setPhotosFor] = useState(null);
  // The backend lets the owner correct entries, and the owner or farm hands keep receipts.
  const canCorrect = hasRole(currentUser, ['FARMER']);
  const canUploadReceipts = hasRole(currentUser, ['FARMER', 'FARM_HAND']);
  const correctableAs = (tx) => (canCorrect ? correctionKind(tx) : null);

  const correction = useMutation({
    mutationFn: ({ transactionId, payload }) => financeApi.correctTransaction(transactionId, payload),
    onSuccess: (result, { kind }) => {
      invalidateLedger();
      setToCorrect(null);
      toast.success(kind === 'income' ? copy.incomeCorrected : copy.expenseCorrected);
    },
    // Shown inside the form, which stays open so the owner can adjust and retry.
  });
  const correctionError = correction.isError
    ? (offlineFailureMessage(correction.error, copy.nothingChanged) || getApiErrorMessage(correction.error, copy.nothingChangedRetry))
    : null;
  const openCorrection = (tx) => {
    correction.reset();
    setToCorrect(tx);
  };

  const openReceipt = async (tx) => {
    if (!tx.receipt_available || !tx.receipt?.id) return;
    try {
      setReceipt(await financeApi.getReceipt(tx.receipt.id));
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    }
  };
  const loadReceiptPdf = async () => {
    if (receiptPdf.current.id !== receipt.id) {
      const blob = await financeApi.downloadReceiptPdf(receipt.id);
      receiptPdf.current = { id: receipt.id, blob };
    }
    return receiptPdf.current.blob;
  };
  const downloadReceipt = async () => {
    setIsReceiptDownloading(true);
    try {
      downloadReceiptPdf(receipt, await loadReceiptPdf());
    } catch (receiptError) {
      toast.error(getApiErrorMessage(receiptError));
    } finally {
      setIsReceiptDownloading(false);
    }
  };
  // The PDF itself where the phone can send files (WhatsApp, email); the receipt as text where it
  // can't, or when the PDF can't be fetched (offline).
  const shareReceipt = async () => {
    setIsReceiptSharing(true);
    try {
      const pdf = canSharePdf() ? await loadReceiptPdf().catch(() => null) : null;
      const sharedAs = await sendReceipt(receipt, pdf);
      if (sharedAs === 'none') toast.error(copy.shareFailed);
      else toast.success(sharedAs === 'copied' ? copy.receiptCopied : copy.receiptShared);
    } catch (receiptError) {
      // A slow PDF download can outlast the tap the phone requires; the PDF is kept for the next tap.
      if (receiptError?.name === 'NotAllowedError') toast(copy.shareTapAgain);
      else if (receiptError?.name !== 'AbortError') toast.error(copy.shareFailed);
    } finally {
      setIsReceiptSharing(false);
    }
  };

  // "View receipt" has its own column, so the menu holds photos and corrections.
  const menuItemsFor = (tx) => {
    const photoCount = readAttachments(tx).length;
    return [
      (photoCount || canUploadReceipts) && { key: 'photos', label: photoCount ? copy.photos(photoCount) : copy.addPhoto, onSelect: () => setPhotosFor(tx) },
      correctableAs(tx) && { key: 'correct', label: copy.correct, onSelect: () => openCorrection(tx) },
    ];
  };

  return {
    menuItemsFor,
    openReceipt,
    receipt: { value: receipt, close: () => setReceipt(null), download: downloadReceipt, share: shareReceipt, isDownloading: isReceiptDownloading, isSharing: isReceiptSharing },
    correction: {
      transaction: toCorrect && correctableAs(toCorrect) ? toCorrect : null,
      kind: toCorrect ? correctableAs(toCorrect) : null,
      close: () => setToCorrect(null),
      submit: (payload) => correction.mutate({ transactionId: toCorrect.id, payload, kind: correctableAs(toCorrect) }),
      isPending: correction.isPending,
      error: correctionError,
    },
    photos: {
      transaction: photosFor,
      title: photosFor ? [photosFor.item_name || photosFor.description || photosFor.category, photosFor.reference_code].filter(Boolean).join(' · ') : '',
      close: () => setPhotosFor(null),
      canUpload: canUploadReceipts,
      onUploaded: invalidateLedger,
    },
  };
}

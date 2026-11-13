import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, ImageOff } from 'lucide-react';
import { financeApi } from '../../lib/backendApi';
import { isPdfAttachment } from '../../lib/receiptAttachments';
import { financeCopy } from '../../i18n/finance';

/**
 * One receipt attachment, fetched with the user's login (the file is private to the
 * farm, so a plain <img src> can't load it). Opens full size in a new tab.
 */
export default function AttachmentThumb({ attachment }) {
  const isPdf = isPdfAttachment(attachment);
  const file = useQuery({
    queryKey: ['ledger-attachment', attachment.url],
    queryFn: () => financeApi.fetchAttachment(attachment.url),
    staleTime: Infinity,
    retry: 1,
  });
  const objectUrl = useMemo(() => (file.data ? URL.createObjectURL(file.data) : null), [file.data]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

  const copy = financeCopy.receiptPhotos;
  const label = attachment.filename || (isPdf ? copy.pdf : copy.photo);
  const open = () => { if (objectUrl) window.open(objectUrl, '_blank', 'noopener'); };

  return (
    <button
      type="button"
      onClick={open}
      disabled={!objectUrl}
      aria-label={copy.open(label)}
      className="group flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md border border-ink/15 bg-ink-50 text-ink-muted transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-default"
    >
      {file.isError ? (
        <><ImageOff size={20} aria-hidden="true" /><span className="mt-1 px-1 text-[11px]">{copy.loadFailed}</span></>
      ) : !objectUrl ? (
        <span className="h-full w-full animate-pulse bg-ink-100" aria-hidden="true" />
      ) : isPdf ? (
        <><FileText size={22} className="text-brand" aria-hidden="true" /><span className="mt-1 line-clamp-2 px-1 text-[11px] text-ink">{label}</span></>
      ) : (
        <img src={objectUrl} alt={label} className="h-full w-full object-cover" />
      )}
    </button>
  );
}

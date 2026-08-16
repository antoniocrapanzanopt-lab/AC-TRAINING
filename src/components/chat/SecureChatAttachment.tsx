import React, { useState, useEffect } from 'react';
import { ZoomIn, Download, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { getSignedChatAttachmentUrl } from '../../lib/chatStorage';

interface SecureChatAttachmentProps {
  type: 'image' | 'video' | 'file';
  pathOrUrl: string;
  fileName?: string;
  isMine?: boolean;
  onOpenLightbox?: (url: string) => void;
  className?: string;
}

export const SecureChatAttachment: React.FC<SecureChatAttachmentProps> = ({
  type,
  pathOrUrl,
  fileName,
  isMine,
  onOpenLightbox,
  className = '',
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getSignedChatAttachmentUrl(pathOrUrl).then((url) => {
      if (isMounted) {
        setResolvedUrl(url);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pathOrUrl]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-black/20 text-slate-400 text-xs animate-pulse max-w-xs">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
        <span>Caricamento allegato sicuro...</span>
      </div>
    );
  }

  if (!resolvedUrl) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 text-xs max-w-xs">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Allegato non accessibile o scaduto.</span>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={`rounded-2xl overflow-hidden border border-black/10 mt-1 max-w-xs shadow-md bg-black/20 space-y-1 p-1 group/img relative ${className}`}>
        <img
          src={resolvedUrl}
          alt={fileName || 'Foto allegata'}
          onClick={() => onOpenLightbox?.(resolvedUrl)}
          className="w-full h-auto object-cover max-h-64 rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
        />
        <button
          type="button"
          onClick={() => onOpenLightbox?.(resolvedUrl)}
          className={`text-[11px] font-bold flex items-center gap-1 px-1 py-0.5 hover:underline cursor-pointer ${
            isMine ? 'text-black' : 'text-amber-400'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5" /> Ingrandisci Foto
        </button>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={`rounded-2xl overflow-hidden border border-black/10 mt-1 max-w-xs shadow-md bg-black/20 p-1 ${className}`}>
        <video src={resolvedUrl} controls className="w-full h-auto max-h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl bg-slate-900 border border-slate-700 mt-1 max-w-xs space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-xs font-bold text-white truncate">{fileName || 'File Allegato'}</p>
      </div>
      <a
        href={resolvedUrl}
        download={fileName || 'allegato'}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-xs font-black underline flex items-center gap-1.5 pt-1 ${
          isMine ? 'text-black hover:text-slate-800' : 'text-[var(--color-primary)] hover:text-amber-300'
        }`}
      >
        <Download className="w-3.5 h-3.5" /> Apri / Scarica File
      </a>
    </div>
  );
};

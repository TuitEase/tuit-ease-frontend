import { useEffect, useRef, useState } from 'react';
import { classShareMessage } from '../../createClass/format';
import { copyText } from '../../lib/clipboard';
import { CopyIcon } from './icons';

export interface SharePanelProps {
  url: string;
  title: string;
  slug: string;
  startsLine: string;
  id?: string;
}

/**
 * The QR package is the only heavy dependency on this page, so it is imported
 * when the panel opens instead of shipping in the initial booking bundle.
 */
export function SharePanel({ url, title, slug, startsLine, id }: SharePanelProps) {
  const [qr, setQr] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQr('');
    setQrFailed(false);
    import('../../createClass/qr')
      .then(({ qrSvg }) => qrSvg(url))
      .then((svg) => {
        if (!cancelled) setQr(svg);
      })
      .catch(() => {
        if (!cancelled) setQrFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    const copiedNow = await copyText(url);
    setCopied(copiedNow);
    setNotice(copiedNow ? null : 'Copy the link below instead.');
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    if (copiedNow) {
      resetTimer.current = window.setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setNotice(null);
    try {
      const { downloadQrPng } = await import('../../createClass/qr');
      await downloadQrPng(url, title, `${slug || 'class'}-qr.png`);
    } catch {
      setNotice('Could not download the QR code. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  const message = classShareMessage(title, startsLine, url);
  const displayUrl = url.replace(/^https?:\/\//, '');

  return (
    <section className="booking-share-panel booking-fade-up" id={id} aria-label="Share this class">
      {qr ? (
        <div
          className="booking-qr"
          role="img"
          aria-label="QR code for this booking page"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
      ) : (
        <div className="booking-qr-placeholder" role="status">
          {qrFailed ? 'QR unavailable' : 'Preparing QR…'}
        </div>
      )}

      <div className="booking-share-body">
        <div>
          <div className="booking-share-title">Know someone who would love this?</div>
          <div className="booking-share-link">{displayUrl}</div>
        </div>
        <div className="booking-share-actions">
          <button type="button" className="booking-btn booking-btn-dark booking-btn-small" onClick={() => void handleCopy()}>
            <CopyIcon />
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <a
            className="booking-btn booking-btn-outline-whatsapp booking-btn-small"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <button
            type="button"
            className="booking-btn booking-btn-outline booking-btn-small"
            onClick={() => void handleDownload()}
            disabled={downloading || !qr}
            aria-busy={downloading}
          >
            {downloading ? 'Preparing…' : 'Download QR'}
          </button>
        </div>
        {notice && (
          <p className="booking-hint" role="status">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}

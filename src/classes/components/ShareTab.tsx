import { useEffect, useState } from 'react';
import { downloadQrPng, qrSvg } from '../../createClass/qr';
import { classShareText, publicClassUrl } from '../model';
import type { HostClassRecord } from '../api';
import { Section } from './ui';

export interface ShareTabProps {
  cls: HostClassRecord;
  timeZone: string;
  onCopy: (text: string, message: string) => void;
  notify: (message: string, kind?: 'success' | 'error') => void;
}

export function ShareTab({ cls, timeZone, onCopy, notify }: ShareTabProps) {
  const url = publicClassUrl(cls.slug);
  const message = classShareText(cls, timeZone);
  const [qr, setQr] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setQr('');
    qrSvg(url)
      .then((svg) => {
        if (!cancelled) setQr(svg);
      })
      .catch(() => {
        if (!cancelled) setQr('');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadQrPng(url, cls.title, `${cls.slug || 'class'}-qr.png`);
      notify('QR code downloaded.');
    } catch {
      notify('Could not download the QR code. Please try again.', 'error');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="tt-tab-body">
      <div className="tt-tab-head">
        <div>
          <h2>Share this class</h2>
          <p>Send the link, drop it in a WhatsApp group, or print the QR code for a flyer.</p>
        </div>
      </div>

      <div className="tt-detail-grid tt-share-grid">
        <div className="tt-stack">
          <Section title="Class link" id="share-link">
            <div className="tt-field">
              <label htmlFor="public-link">Public class page</label>
              <input id="public-link" type="url" value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
            </div>
            <div className="tt-share-actions">
              <button
                type="button"
                className="tt-btn tt-btn-primary"
                onClick={() => onCopy(url, 'Class link copied.')}
              >
                Copy link
              </button>
              <a
                className="tt-btn tt-btn-secondary"
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
              >
                Share on WhatsApp
              </a>
              <a className="tt-btn tt-btn-ghost" href={url} target="_blank" rel="noreferrer">
                Open public page
              </a>
            </div>
            <p className="tt-hint">
              Scanning opens <code>/class/{cls.slug}/</code>, a public booking page students can open without an
              account.
            </p>
          </Section>

          <Section title="Invite message" id="share-message">
            <div className="tt-field">
              <label htmlFor="invite-message">Message students will see</label>
              <textarea
                id="invite-message"
                rows={5}
                readOnly
                value={message}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <button
              type="button"
              className="tt-btn tt-btn-secondary"
              onClick={() => onCopy(message, 'Invite message copied.')}
            >
              Copy message
            </button>
          </Section>
        </div>

        <aside className="tt-stack">
          <Section title="QR code" id="share-qr">
            <div className="tt-qr">
              {qr ? (
                <div className="tt-qr-svg" dangerouslySetInnerHTML={{ __html: qr }} />
              ) : (
                <div className="tt-qr-placeholder" role="status">
                  Preparing the QR code…
                </div>
              )}
            </div>
            <p className="tt-hint">Scanning opens the public booking page for {cls.title}.</p>
            <button
              type="button"
              className="tt-btn tt-btn-secondary"
              onClick={() => void handleDownload()}
              disabled={downloading || !qr}
              aria-busy={downloading}
            >
              {downloading ? 'Preparing PNG…' : 'Download QR (PNG)'}
            </button>
            <button
              type="button"
              className="tt-btn tt-btn-ghost"
              onClick={() => onCopy(url, 'Class link copied for your flyer.')}
            >
              Copy link for a flyer
            </button>
          </Section>
        </aside>
      </div>
    </div>
  );
}

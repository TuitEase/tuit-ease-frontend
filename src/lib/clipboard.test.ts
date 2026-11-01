import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

function setClipboard(value: Clipboard | undefined) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
  setClipboard(undefined);
});

describe('copyText', () => {
  it('uses the async clipboard when it is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText } as unknown as Clipboard);

    await expect(copyText('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to a hidden textarea when the clipboard is denied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard({ writeText } as unknown as Clipboard);
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    await expect(copyText('fallback')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports failure instead of throwing when nothing can copy', async () => {
    setClipboard(undefined);
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn(() => {
        throw new Error('blocked');
      }),
      configurable: true,
    });

    await expect(copyText('nope')).resolves.toBe(false);
  });
});

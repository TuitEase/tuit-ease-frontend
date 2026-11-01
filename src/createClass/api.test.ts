import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateClassApiError, deleteSession, updateSession } from './api';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  fetchMock.mockReset();
});

describe('updateSession', () => {
  it('PATCHes one session and returns the saved row', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 12,
        number: 2,
        starts_at: '2030-10-10T09:00:00Z',
        duration_minutes: 90,
        meeting_link: '',
        venue: null,
      }),
    );

    const saved = await updateSession(5, 12, {
      starts_at: '2030-10-10T09:00:00Z',
      duration_minutes: 90,
      meeting_link: '',
    });

    expect(saved.id).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/host/classes/5/sessions/12/');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      starts_at: '2030-10-10T09:00:00Z',
      duration_minutes: 90,
      meeting_link: '',
    });
  });

  it('surfaces a field error from the API', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ starts_at: ['Enter a valid date.'] }, 400));

    await expect(
      updateSession(5, 12, { starts_at: 'nope', duration_minutes: 90 }),
    ).rejects.toMatchObject({
      message: 'Enter a valid date.',
      fields: { starts_at: ['Enter a valid date.'] },
      status: 400,
    });
  });
});

describe('deleteSession', () => {
  it('DELETEs the session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteSession(5, 12)).resolves.toBeUndefined();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/host/classes/5/sessions/12/');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('treats an already deleted session as success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Session not found in DB' }, 404));

    await expect(deleteSession(5, 12)).resolves.toBeUndefined();
  });

  it('still surfaces other failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Server error' }, 500));

    await expect(deleteSession(5, 12)).rejects.toBeInstanceOf(CreateClassApiError);
  });
});

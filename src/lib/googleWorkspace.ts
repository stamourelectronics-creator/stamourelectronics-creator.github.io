export type GoogleAgentResult = { ok: boolean; data?: any; error?: string };

async function googleFetch(path: string, accessToken: string, init: RequestInit = {}): Promise<any> {
  if (!accessToken) throw new Error('Google access is not connected. Sign in with Google and approve the requested permissions.');
  const response = await fetch('https://www.googleapis.com' + path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
      Authorization: 'Bearer ' + accessToken,
    },
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data?.error?.message || data?.error_description || 'Google API request failed (' + response.status + ').';
    throw new Error(message);
  }
  return data;
}

export async function listGmailMessages(accessToken: string, query = 'in:anywhere', maxResults = 10) {
  const params = new URLSearchParams({ maxResults: String(Math.min(Math.max(maxResults, 1), 25)) });
  if (query.trim()) params.set('q', query.trim());
  const list = await googleFetch('/gmail/v1/users/me/messages?' + params.toString(), accessToken);
  const ids = Array.isArray(list.messages) ? list.messages.slice(0, 25) : [];
  const messages = await Promise.all(ids.map((item: any) =>
    googleFetch('/gmail/v1/users/me/messages/' + encodeURIComponent(item.id) + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date', accessToken)
  ));
  return messages.map((message: any) => {
    const headers = Object.fromEntries((message.payload?.headers || []).map((h: any) => [String(h.name).toLowerCase(), h.value]));
    return { id: message.id, threadId: message.threadId, snippet: message.snippet || '', from: headers.from || '', to: headers.to || '', subject: headers.subject || '', date: headers.date || '', labelIds: message.labelIds || [] };
  });
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/g, '');
}

export async function sendGmail(accessToken: string, to: string, subject: string, body: string) {
  if (!to.trim()) throw new Error('A recipient is required.');
  const raw = [
    'To: ' + to.trim(),
    'Subject: ' + subject.replace(/[\\r\\n]+/g, ' ').trim(),
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\\r\\n');
  return googleFetch('/gmail/v1/users/me/messages/send', accessToken, {
    method: 'POST',
    body: JSON.stringify({ raw: base64UrlEncode(raw) }),
  });
}

export async function listCalendarEvents(accessToken: string, timeMin = new Date().toISOString(), maxResults = 10) {
  const params = new URLSearchParams({ timeMin, singleEvents: 'true', orderBy: 'startTime', maxResults: String(Math.min(Math.max(maxResults, 1), 25)) });
  const data = await googleFetch('/calendar/v3/calendars/primary/events?' + params.toString(), accessToken);
  return (data.items || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || '(No title)',
    description: event.description || '',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    location: event.location || '',
    htmlLink: event.htmlLink || '',
    attendees: (event.attendees || []).map((a: any) => a.email).filter(Boolean),
  }));
}

export async function createCalendarEvent(accessToken: string, event: {
  summary: string; description?: string; start: string; end: string; timeZone?: string; attendees?: string[];
}) {
  const body: any = {
    summary: event.summary,
    description: event.description || '',
    start: { dateTime: event.start, timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: event.end, timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
  if (event.attendees?.length) body.attendees = event.attendees.map(email => ({ email }));
  return googleFetch('/calendar/v3/calendars/primary/events?sendUpdates=all', accessToken, { method: 'POST', body: JSON.stringify(body) });
}

export async function listDriveFiles(accessToken: string, query = 'trashed = false', pageSize = 20) {
  const params = new URLSearchParams({ q: query, pageSize: String(Math.min(Math.max(pageSize, 1), 100)), orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)' });
  return googleFetch('/drive/v3/files?' + params.toString(), accessToken);
}

export async function listTasks(accessToken: string, maxResults = 20) {
  const lists = await googleFetch('/tasks/v1/users/@me/lists?maxResults=20', accessToken);
  const primary = Array.isArray(lists.items) ? lists.items[0] : null;
  if (!primary?.id) return [];
  const data = await googleFetch('/tasks/v1/lists/' + encodeURIComponent(primary.id) + '/tasks?showCompleted=false&maxResults=' + Math.min(Math.max(maxResults, 1), 100), accessToken);
  return (data.items || []).map((task: any) => ({ id: task.id, title: task.title || '', notes: task.notes || '', due: task.due || '', status: task.status || '' }));
}

export async function listContacts(accessToken: string, pageSize = 50) {
  const params = new URLSearchParams({ pageSize: String(Math.min(Math.max(pageSize, 1), 100)), personFields: 'names,emailAddresses,photos' });
  const data = await googleFetch('/people/v1/people/me/connections?' + params.toString(), accessToken);
  return (data.connections || []).map((person: any) => ({
    resourceName: person.resourceName,
    name: person.names?.[0]?.displayName || '',
    emails: (person.emailAddresses || []).map((x: any) => x.value).filter(Boolean),
  }));
}

export async function runGoogleAgentAction(accessToken: string, action: string, args: any = {}) {
  switch (action) {
    case 'gmail.list': return listGmailMessages(accessToken, args.query || 'in:anywhere', args.maxResults || 10);
    case 'gmail.send': return sendGmail(accessToken, args.to || '', args.subject || '', args.body || '');
    case 'calendar.list': return listCalendarEvents(accessToken, args.timeMin, args.maxResults || 10);
    case 'calendar.create': return createCalendarEvent(accessToken, args);
    case 'drive.list': return listDriveFiles(accessToken, args.query || 'trashed = false', args.pageSize || 20);
    case 'tasks.list': return listTasks(accessToken, args.maxResults || 20);
    case 'contacts.list': return listContacts(accessToken, args.pageSize || 50);
    default: throw new Error('Unsupported Google agent action: ' + action);
  }
}

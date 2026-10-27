import React, { useState, useEffect } from 'react';
import { Mail, Send, X, Check, AlertCircle, LogIn, Sparkles, User } from 'lucide-react';

interface GmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject: string;
  initialBody: string;
  currentUser: any;
  userNickname?: string;
  googleAccessToken: string | null;
  onGoogleSignIn: () => Promise<void>;
}

export const GmailComposeModal: React.FC<GmailComposeModalProps> = ({
  isOpen,
  onClose,
  initialSubject,
  initialBody,
  currentUser,
  userNickname,
  googleAccessToken,
  onGoogleSignIn,
}) => {
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>(initialSubject || '');
  const [body, setBody] = useState<string>(initialBody || '');
  const [sending, setSending] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const senderName = currentUser?.displayName || userNickname || 'User';

  useEffect(() => {
    setSubject(initialSubject || '');
    let formattedBody = initialBody || '';
    if (formattedBody && senderName && senderName !== 'User') {
      // Auto-replace generic placeholder tokens with real Google name if present
      formattedBody = formattedBody
        .replace(/\[Your Name Here\]/gi, senderName)
        .replace(/\(Your Name Here\)/gi, senderName)
        .replace(/\[Your Name\]/gi, senderName)
        .replace(/\(Your Name\)/gi, senderName);
    }
    setBody(formattedBody);
    setStatus(null);
  }, [initialSubject, initialBody, isOpen, senderName]);

  if (!isOpen) return null;

  const handleSendEmail = async () => {
    if (!recipient.trim()) {
      setStatus({ type: 'error', message: 'Please enter a recipient email address.' });
      return;
    }

    if (!googleAccessToken) {
      setStatus({ type: 'error', message: 'You must be signed in with your Google account to send emails via Gmail.' });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      // Build RFC 2822 email format
      const rawEmailLines = [
        `To: ${recipient.trim()}`,
        `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject.trim())))}?=`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body.trim(),
      ].join('\r\n');

      // Base64URL encoding (RFC 4648)
      const encodedRaw = btoa(unescape(encodeURIComponent(rawEmailLines)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedRaw }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: `Email successfully sent to ${recipient.trim()} via Gmail!` });
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        console.error('Gmail API Error Response:', responseData);
        if (responseData.error?.code === 401 || responseData.error?.status === 'UNAUTHENTICATED') {
          setStatus({
            type: 'error',
            message: 'Gmail authentication expired or missing permission. Please click "Sign in with Google" to re-authorize.',
          });
        } else {
          setStatus({
            type: 'error',
            message: `Gmail Send Failed: ${responseData.error?.message || 'Check recipient address and try again.'}`,
          });
        }
      }
    } catch (err: any) {
      console.error('Gmail send exception:', err);
      setStatus({ type: 'error', message: `Send Failed: ${err.message || 'Network error'}` });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-500 via-amber-500 to-blue-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                <Mail className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-sans flex items-center gap-2">
                Gmail Email Dispatcher
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                  Gmail API
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Send your AI-generated draft instantly via your Google account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Status Banner */}
        <div className="px-6 py-3 bg-zinc-950/40 border-b border-zinc-800/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <User className="w-3.5 h-3.5 text-amber-500" />
            <span>Sender:</span>
            {currentUser?.email ? (
              <span className="text-emerald-400 font-semibold">
                {currentUser.displayName ? `${currentUser.displayName} (${currentUser.email})` : currentUser.email}
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">Not signed in to Google</span>
            )}
          </div>
          {(!currentUser || !googleAccessToken) && (
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-sans font-semibold text-xs transition-colors cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          )}
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 font-sans">
          {status && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-fade-in ${
                status.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {status.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Recipient To Field */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              To (Recipient Email Address):
            </label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. colleague@company.com, client@domain.com"
              className="w-full bg-zinc-950 border border-zinc-750 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors placeholder-zinc-500 font-sans"
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Subject Line:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email Subject"
              className="w-full bg-zinc-950 border border-zinc-750 focus:border-red-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors font-semibold"
            />
          </div>

          {/* Email Body Field */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-mono">
              Email Body Content (Editable):
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Type or refine your email message body..."
              className="w-full bg-zinc-950 border border-zinc-750 focus:border-red-500 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none transition-colors font-sans leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sending || !recipient.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm transition-all shadow-lg hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending via Gmail...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Email via Gmail</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

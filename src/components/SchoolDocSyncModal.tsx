import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  Copy,
  Download,
  AlertCircle,
  PlusCircle,
  Edit3,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, GoogleAuthProvider } from '../firebase';
import { formatMathAndFractions, MATH_FRACTION_SYMBOLS, MATH_OPERATION_SYMBOLS } from '../lib/mathFormatter';

interface SchoolDocSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  studyContent: string;
  googleAccessToken: string | null;
  onUpdateGoogleAccessToken: (token: string) => void;
  currentUser: any;
  isLight?: boolean;
}

export const SchoolDocSyncModal: React.FC<SchoolDocSyncModalProps> = ({
  isOpen,
  onClose,
  initialTitle,
  studyContent,
  googleAccessToken,
  onUpdateGoogleAccessToken,
  currentUser,
  isLight = false,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');
  const [docTitle, setDocTitle] = useState<string>(initialTitle || 'IsaiahAI Study Guide');
  const [editableNotes, setEditableNotes] = useState<string>(studyContent);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Existing doc editing states
  const [existingDocInput, setExistingDocInput] = useState<string>('');
  const [existingDocId, setExistingDocId] = useState<string>('');
  const [existingDocTitle, setExistingDocTitle] = useState<string>('');
  const [existingDocContent, setExistingDocContent] = useState<string>('');
  const [isFetchingDoc, setIsFetchingDoc] = useState<boolean>(false);

  // Synchronize when inputs change
  useEffect(() => {
    if (initialTitle) setDocTitle(initialTitle);
    if (studyContent) setEditableNotes(formatMathAndFractions(studyContent));
  }, [initialTitle, studyContent]);

  if (!isOpen) return null;

  // Extract Google Doc ID from URL or bare ID
  const extractDocId = (input: string): string => {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    return trimmed;
  };

  const handleSignInForDocs = async (): Promise<string | null> => {
    if (!auth) {
      setErrorMessage("Firebase Authentication is initializing.");
      return null;
    }
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const token = credential.accessToken;
        onUpdateGoogleAccessToken(token);
        sessionStorage.setItem('google_access_token', token);
        localStorage.setItem('google_access_token', token);
        setSuccessNotice("Google Docs authorization connected successfully!");
        setTimeout(() => setSuccessNotice(null), 3500);
        return token;
      } else {
        throw new Error("Could not acquire Google Docs access token.");
      }
    } catch (err: any) {
      console.error("Google sign in for Docs error:", err);
      setErrorMessage(err.message || "Failed to authorize Google Docs. Please try again.");
      return null;
    } finally {
      setIsSigningIn(false);
    }
  };

  // Helper to insert a fraction or math symbol into notes
  const handleInsertSymbol = (symbol: string) => {
    setEditableNotes((prev) => {
      return prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + symbol;
    });
  };

  // Format all math and fraction symbols currently in text
  const handleFormatAllMath = () => {
    setEditableNotes((prev) => formatMathAndFractions(prev));
    setSuccessNotice("Formatted all text into real math and fraction symbols!");
    setTimeout(() => setSuccessNotice(null), 2500);
  };

  // 1. CREATE NEW GOOGLE DOC
  const handleSyncToGoogleDocs = async () => {
    let token = googleAccessToken || sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
    if (!token) {
      token = await handleSignInForDocs();
      if (!token) return;
    }

    const titleToUse = docTitle.trim() || 'IsaiahAI Study Guide';
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      // 1. Create empty Google Document
      let createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: titleToUse,
        }),
      });

      if (!createRes.ok) {
        if (createRes.status === 401 || createRes.status === 403) {
          // Token expired, re-prompt once and retry
          token = await handleSignInForDocs();
          if (!token) throw new Error('Google Docs authorization expired. Please reconnect.');
          createRes = await fetch('https://docs.googleapis.com/v1/documents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: titleToUse,
            }),
          });
        }
      }

      if (!createRes.ok) {
        throw new Error(`Google Docs API error (${createRes.status}): ${createRes.statusText}`);
      }

      const docData = await createRes.json();
      const documentId = docData.documentId;
      if (!documentId) {
        throw new Error('Google Docs returned no document identifier.');
      }

      // 2. Prepare text content with header, formatted fractions and math symbols
      const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const cleanContent = formatMathAndFractions(editableNotes.replace(/[#*`_]/g, ''));
      const fullText = `${titleToUse}\nPrepared with IsaiahAI School Mode · ${dateStr}\n\n${cleanContent}\n\nGenerated with Isaiahsi & St.Amour Educational Systems.\n`;

      // 3. BatchUpdate to insert text into the new document at index 1
      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: fullText,
              },
            },
          ],
        }),
      });

      if (!updateRes.ok) {
        throw new Error(`Could not insert text into Google Doc: ${updateRes.statusText}`);
      }

      const finalUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      setCreatedDocUrl(finalUrl);
      setSuccessNotice(`Successfully created Google Doc "${titleToUse}"!`);
      try {
        window.open(finalUrl, '_blank');
      } catch (e) {
        console.warn('Popup blocked, viewable via link button');
      }
    } catch (err: any) {
      console.error('Google Docs sync error:', err);
      setErrorMessage(err.message || 'Error syncing to Google Docs. Please reconnect.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. LOAD EXISTING GOOGLE DOC
  const handleFetchExistingDoc = async () => {
    const docId = extractDocId(existingDocInput);
    if (!docId) {
      setErrorMessage('Please enter a valid Google Document URL or ID.');
      return;
    }

    let token = googleAccessToken || sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
    if (!token) {
      token = await handleSignInForDocs();
      if (!token) return;
    }

    setIsFetchingDoc(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      let res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok && (res.status === 401 || res.status === 403)) {
        token = await handleSignInForDocs();
        if (token) {
          res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Google Docs permission denied or token expired. Please reconnect.');
        }
        if (res.status === 404) {
          throw new Error('Google Document not found. Ensure the doc exists and you have permission to view it.');
        }
        throw new Error(`Failed to load Google Doc: ${res.statusText}`);
      }

      const data = await res.json();
      setExistingDocId(docId);
      setExistingDocTitle(data.title || 'Untitled Document');

      // Extract plain text from document structural elements
      let docText = '';
      if (data.body && data.body.content) {
        for (const element of data.body.content) {
          if (element.paragraph && element.paragraph.elements) {
            for (const pe of element.paragraph.elements) {
              if (pe.textRun && pe.textRun.content) {
                docText += pe.textRun.content;
              }
            }
          }
        }
      }

      setExistingDocContent(formatMathAndFractions(docText));
      setSuccessNotice(`Loaded "${data.title || 'Google Doc'}" successfully!`);
    } catch (err: any) {
      console.error('Fetch Google Doc error:', err);
      setErrorMessage(err.message || 'Could not load Google Doc.');
    } finally {
      setIsFetchingDoc(false);
    }
  };

  // 3. APPEND / SAVE EDITS TO EXISTING GOOGLE DOC
  const handleAppendNotesToExistingDoc = async () => {
    if (!existingDocId) {
      setErrorMessage('Please load an existing Google Document first.');
      return;
    }
    let token = googleAccessToken || sessionStorage.getItem('google_access_token') || localStorage.getItem('google_access_token');
    if (!token) {
      token = await handleSignInForDocs();
      if (!token) return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const cleanContent = formatMathAndFractions(editableNotes.replace(/[#*`_]/g, ''));
      const appendText = `\n\n--- IsaiahAI School Mode Study Notes (${dateStr}) ---\n${cleanContent}\n`;

      const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${existingDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                endOfSegmentLocation: {
                  segmentId: '',
                },
                text: appendText,
              },
            },
          ],
        }),
      });

      if (!updateRes.ok) {
        throw new Error(`Could not append notes to Google Doc: ${updateRes.statusText}`);
      }

      const finalUrl = `https://docs.google.com/document/d/${existingDocId}/edit`;
      setCreatedDocUrl(finalUrl);
      setSuccessNotice(`Appended study notes to "${existingDocTitle}"!`);
      setExistingDocContent((prev) => prev + appendText);
      try {
        window.open(finalUrl, '_blank');
      } catch (e) {}
    } catch (err: any) {
      console.error('Append to doc error:', err);
      setErrorMessage(err.message || 'Error updating Google Doc.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyNotes = () => {
    try {
      const textToCopy = activeTab === 'create' ? editableNotes : existingDocContent;
      navigator.clipboard.writeText(textToCopy);
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    } catch (err) {
      console.warn('Copy error:', err);
    }
  };

  const handleOpenGoogleDocsManual = () => {
    handleCopyNotes();
    try {
      window.open('https://docs.google.com/document/create', '_blank');
      setSuccessNotice('Opened Google Docs in new tab and copied formatted notes to clipboard! Simply press Ctrl+V / Cmd+V to paste.');
    } catch (e) {
      setErrorMessage('Could not open new tab. Please open https://docs.google.com/document/create and paste notes.');
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const textToDownload = activeTab === 'create' ? editableNotes : existingDocContent;
      const fileName = `${(docTitle || 'study_guide').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.md`;
      const blob = new Blob([textToDownload], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-900'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>Google Docs Study Workbench</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-semibold uppercase">
                  School Mode
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                Draft study guides, organize notes & sync live with your Google Drive
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-800 text-zinc-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth / Account Status Strip */}
        <div
          className={`px-5 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 ${
            isLight ? 'bg-zinc-100/70 border-zinc-200' : 'bg-zinc-900/40 border-zinc-800/70'
          }`}
        >
          <div className="flex items-center gap-2 text-zinc-400">
            {currentUser ? (
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Google Account: <strong className="text-white">{currentUser.displayName || currentUser.email}</strong></span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Not signed in with Google</span>
              </span>
            )}
            <span className="text-zinc-600">·</span>
            {googleAccessToken ? (
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Docs API: Authorized</span>
              </span>
            ) : (
              <span className="text-amber-400/90 font-mono text-[11px]">
                Docs API: Token Needed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGoogleDocsManual}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 border border-blue-800/40'
              }`}
              title="Open blank Google Doc and copy formatted content to clipboard"
            >
              <ExternalLink className="w-3 h-3" />
              <span>1-Click Paste to Docs</span>
            </button>

            <button
              type="button"
              onClick={handleSignInForDocs}
              disabled={isSigningIn}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }`}
            >
              {isSigningIn ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleAccessToken ? 'Re-authorize Docs' : 'Connect Google'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b text-xs font-semibold ${
            isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800 bg-zinc-900/30'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Prepare New Google Doc</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit / Append Existing Google Doc</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleSignInForDocs}
                className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-semibold text-[11px] shrink-0 cursor-pointer"
              >
                Authorize
              </button>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successNotice}</span>
              </div>
              {createdDocUrl && (
                <a
                  href={createdDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Open in Google Docs</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {activeTab === 'create' ? (
            /* TAB 1: PREPARE NEW GOOGLE DOC */
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Google Document Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Calculus - Derivatives Study Guide"
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border outline-none font-medium transition-all ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:bg-white focus:border-blue-500'
                      : 'bg-zinc-900 border-zinc-800 text-white focus:bg-zinc-950 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Math & Real Fraction Quick Symbol Toolbar */}
              <div className={`p-2.5 rounded-2xl border ${isLight ? 'bg-zinc-50 border-zinc-250' : 'bg-zinc-900/60 border-zinc-800'} space-y-2`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <span>⚡ Real Fraction & Math Symbols:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleFormatAllMath}
                    className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold cursor-pointer transition-colors"
                  >
                    Format All Fractions in Text
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono mr-1">Fractions:</span>
                  {MATH_FRACTION_SYMBOLS.map((frac) => (
                    <button
                      key={frac}
                      type="button"
                      onClick={() => handleInsertSymbol(frac)}
                      className={`px-2 py-1 rounded-lg text-xs font-serif font-bold transition-transform hover:scale-110 cursor-pointer ${
                        isLight ? 'bg-white hover:bg-indigo-50 border border-zinc-200 text-zinc-800' : 'bg-zinc-800 hover:bg-indigo-900/40 border border-zinc-700 text-white'
                      }`}
                      title={`Insert real fraction ${frac}`}
                    >
                      {frac}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 items-center pt-1 border-t border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono mr-1">Math:</span>
                  {MATH_OPERATION_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleInsertSymbol(sym)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition-transform hover:scale-110 cursor-pointer ${
                        isLight ? 'bg-white hover:bg-indigo-50 border border-zinc-200 text-zinc-800' : 'bg-zinc-800 hover:bg-indigo-900/40 border border-zinc-700 text-white'
                      }`}
                      title={`Insert math symbol ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Study Notes & Outline Content (Formatted with Real Symbols)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyNotes}
                      className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                        copiedSuccess
                          ? 'text-emerald-400'
                          : isLight
                          ? 'text-zinc-600 hover:text-zinc-900'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className={`text-xs px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                        isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .md</span>
                    </button>
                  </div>
                </div>
                <textarea
                  value={editableNotes}
                  onChange={(e) => setEditableNotes(e.target.value)}
                  rows={12}
                  className={`w-full p-3.5 text-xs sm:text-sm font-sans leading-relaxed rounded-xl border outline-none resize-none transition-all ${
                    isLight
                      ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-blue-500'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-200 focus:bg-zinc-950 focus:border-blue-500'
                  }`}
                  placeholder="Study notes content..."
                />
              </div>
            </div>
          ) : (
            /* TAB 2: EDIT / APPEND EXISTING GOOGLE DOC */
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Google Document URL or Document ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={existingDocInput}
                    onChange={(e) => setExistingDocInput(e.target.value)}
                    placeholder="https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className={`flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border outline-none font-mono transition-all ${
                      isLight
                        ? 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:bg-white focus:border-blue-500'
                        : 'bg-zinc-900 border-zinc-800 text-white focus:bg-zinc-950 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleFetchExistingDoc}
                    disabled={isFetchingDoc}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-md"
                  >
                    {isFetchingDoc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Fetch Doc</span>
                  </button>
                </div>
              </div>

              {existingDocId && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Document: <strong className="text-white">{existingDocTitle}</strong></span>
                    </span>
                    <a
                      href={`https://docs.google.com/document/d/${existingDocId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open on Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Document Content (from Google Drive)
                    </label>
                    <textarea
                      value={existingDocContent}
                      onChange={(e) => setExistingDocContent(e.target.value)}
                      rows={9}
                      className={`w-full p-3.5 text-xs font-mono leading-relaxed rounded-xl border outline-none resize-none transition-all ${
                        isLight
                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:bg-white focus:border-blue-500'
                          : 'bg-zinc-900/70 border-zinc-800 text-zinc-200 focus:bg-zinc-950 focus:border-blue-500'
                      }`}
                      placeholder="Loaded document text..."
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-center justify-between gap-3 text-xs">
                    <div className="text-zinc-300">
                      <span>Ready to append the current School Mode study notes to this Google Doc?</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAppendNotesToExistingDoc}
                      disabled={isSyncing}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                    >
                      {isSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                      <span>Append Notes to Doc</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between border-t ${
            isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/60'
          }`}
        >
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            {currentUser ? (
              <span>Account: <strong className="text-zinc-200">{currentUser.displayName || currentUser.email}</strong></span>
            ) : (
              <span className="text-amber-400">Sign in with Google required to sync directly to Drive</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                isLight ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              Close
            </button>

            {!currentUser || !googleAccessToken ? (
              <button
                type="button"
                onClick={handleSignInForDocs}
                disabled={isSigningIn}
                className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {isSigningIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Connect Google Account</span>
              </button>
            ) : activeTab === 'create' ? (
              <button
                type="button"
                onClick={handleSyncToGoogleDocs}
                disabled={isSyncing}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing to Google Drive...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Sync to Google Docs</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

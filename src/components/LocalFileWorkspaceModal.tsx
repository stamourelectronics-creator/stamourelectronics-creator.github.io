import React, { useState, useEffect } from 'react';
import { X, Folder, FileCode, Eye, Save, RefreshCw, CheckCircle2, Play, HardDrive, ExternalLink, Code } from 'lucide-react';
import { LocalFileItem, readFileText, writeFileText } from '../lib/localWorkspace';

interface LocalFileWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dirName: string | null;
  files: LocalFileItem[];
  activeFile: LocalFileItem | null;
  onSelectFile: (file: LocalFileItem) => void;
  onUpdateFileContent: (file: LocalFileItem, newContent: string) => Promise<boolean>;
  isLight?: boolean;
  onAskCodePR: (prompt: string) => void;
}

export const LocalFileWorkspaceModal: React.FC<LocalFileWorkspaceModalProps> = ({
  isOpen,
  onClose,
  dirName,
  files,
  activeFile,
  onSelectFile,
  onUpdateFileContent,
  isLight = false,
  onAskCodePR,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [currentContent, setCurrentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    if (activeFile && activeFile.handle) {
      setIsLoading(true);
      readFileText(activeFile.handle)
        .then((text) => {
          setCurrentContent(text);
          setHasUnsavedChanges(false);
        })
        .catch((e) => {
          console.error('Error reading file:', e);
          setCurrentContent('// Error reading file from your PC');
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeFile]);

  if (!isOpen) return null;

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.path.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleManualSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      const ok = await onUpdateFileContent(activeFile, currentContent);
      if (ok) {
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e: any) {
      alert('Save failed: ' + (e.message || 'Permission denied'));
    } finally {
      setIsSaving(false);
    }
  };

  const isHtml = activeFile?.name.toLowerCase().endsWith('.html') || activeFile?.name.toLowerCase().endsWith('.htm');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border ${
          isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Top Header */}
        <div className={`px-4 py-3 flex items-center justify-between border-b ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800/80 bg-zinc-900/60'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">
                  {dirName ? `Folder: ${dirName}` : activeFile ? `File: ${activeFile.name}` : 'Local PC Workspace'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-medium border border-emerald-500/20">
                  Live PC Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {files.length > 0 ? `${files.length} project file${files.length > 1 ? 's' : ''} connected on computer` : 'Single file mode'}
                {activeFile ? ` • Editing: ${activeFile.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch for HTML files */}
            {isHtml && (
              <div className={`flex items-center p-0.5 rounded-lg border text-xs ${isLight ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-900 border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    activeTab === 'editor'
                      ? (isLight ? 'bg-white shadow text-zinc-900' : 'bg-zinc-800 text-white shadow')
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    activeTab === 'preview'
                      ? (isLight ? 'bg-white shadow text-zinc-900' : 'bg-zinc-800 text-white shadow')
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Live Preview
                </button>
              </div>
            )}

            {/* Save to PC Button */}
            {activeFile && (
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isSaving || !hasUnsavedChanges}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hasUnsavedChanges
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-md'
                    : saveSuccess
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isLight
                    ? 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Saved to PC
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {hasUnsavedChanges ? 'Save Changes to PC' : 'Saved'}
                  </>
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLight ? 'hover:bg-zinc-200 text-zinc-500' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="Close Workspace Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Sidebar + Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: File Tree */}
          {files.length > 1 && (
            <div className={`w-64 flex-shrink-0 flex flex-col border-r ${isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-zinc-800/80 bg-zinc-900/30'}`}>
              <div className="p-2.5 border-b border-inherit">
                <input
                  type="text"
                  placeholder="Filter project files..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border outline-none ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600'
                  }`}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredFiles.map((file) => {
                  const isSelected = activeFile?.path === file.path;
                  const isHtmlFile = file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
                  return (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() => onSelectFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? (isLight ? 'bg-amber-500/15 text-amber-900 font-semibold' : 'bg-amber-500/20 text-amber-300 font-semibold border-l-2 border-amber-500')
                          : (isLight ? 'text-zinc-700 hover:bg-zinc-200/60' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60')
                      }`}
                    >
                      {isHtmlFile ? (
                        <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileCode className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1">{file.name}</span>
                      {isHtmlFile && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">HTML</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Workspace Pane */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black/20">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Reading file from your computer...
              </div>
            ) : activeTab === 'preview' && isHtml ? (
              /* Live HTML Iframe Preview */
              <div className="flex-1 flex flex-col bg-white">
                <div className="bg-zinc-900 text-zinc-400 px-3 py-1.5 flex items-center justify-between text-xs border-b border-zinc-800">
                  <span className="font-mono text-[11px] text-zinc-300">Live Browser Preview of {activeFile?.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Trigger iframe refresh
                      const iframe = document.getElementById('local-html-iframe') as HTMLIFrameElement;
                      if (iframe) iframe.srcdoc = currentContent;
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                </div>
                <iframe
                  id="local-html-iframe"
                  srcDoc={currentContent}
                  title="HTML File Live Preview"
                  sandbox="allow-scripts allow-modals"
                  className="w-full flex-1 border-0 bg-white"
                />
              </div>
            ) : (
              /* Code Editor / Viewer */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className={`px-3 py-1.5 flex items-center justify-between border-b text-[11px] font-mono ${
                  isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                }`}>
                  <span className="truncate">
                    {activeFile ? `${activeFile.path || activeFile.name} (${(currentContent.length / 1024).toFixed(1)} KB)` : 'No file selected'}
                  </span>
                  <div className="flex items-center gap-3">
                    {hasUnsavedChanges && (
                      <span className="text-amber-400 font-semibold">• Unsaved Changes</span>
                    )}
                    <button
                      type="button"
                      onClick={() => onAskCodePR(`Review and improve the code of ${activeFile?.name || 'this file'}: make it modern, responsive, and polished.`)}
                      className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      ⚡ Ask Code PR to Edit
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative overflow-auto">
                  <textarea
                    value={currentContent}
                    onChange={(e) => {
                      setCurrentContent(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className={`w-full h-full p-4 font-mono text-xs leading-relaxed resize-none outline-none border-0 ${
                      isLight ? 'bg-zinc-50 text-zinc-900 selection:bg-amber-200' : 'bg-zinc-950 text-zinc-200 selection:bg-amber-500/30'
                    }`}
                    spellCheck={false}
                    placeholder="File content will appear here..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

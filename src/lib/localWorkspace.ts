// File System Access API integration for Desktop Computer Local Workspace
// Enables IsaiahAI Code PR to ask for file access, read files on PC, auto-load HTML,
// and write/edit files directly on the user's computer in the background.

export interface LocalFileItem {
  name: string;
  path: string;
  size: number;
  type: string;
  handle: any; // FileSystemFileHandle
  lastModified?: number;
}

export interface WorkspaceState {
  isSupported: boolean;
  isConnected: boolean;
  type: 'directory' | 'file' | null;
  dirName: string | null;
  activeFileName: string | null;
  activeFileContent: string;
  files: LocalFileItem[];
  lastSavedTime: string | null;
  autoSaveEnabled: boolean;
  lastActionMessage: string | null;
}

export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).showOpenFilePicker === 'function' || typeof (window as any).showDirectoryPicker === 'function';
}

// Read text from a FileSystemFileHandle
export async function readFileText(fileHandle: any): Promise<string> {
  try {
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (err) {
    console.error('[LocalWorkspace] Failed to read file text:', err);
    throw err;
  }
}

// Write text directly to a FileSystemFileHandle on user's computer
export async function writeFileText(fileHandle: any, content: string): Promise<boolean> {
  try {
    // Request permission if not already granted
    if (fileHandle.queryPermission) {
      const perm = await fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        const req = await fileHandle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') {
          throw new Error('Permission to write to file was denied by user.');
        }
      }
    }
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error('[LocalWorkspace] Failed to write file text:', err);
    throw err;
  }
}

// Pick a single HTML or code file
export async function pickLocalFile(): Promise<{ handle: any; name: string; content: string }> {
  if (typeof (window as any).showOpenFilePicker !== 'function') {
    throw new Error('File System Access API is not supported on this browser/device.');
  }

  const [handle] = await (window as any).showOpenFilePicker({
    types: [
      {
        description: 'Web & Source Files',
        accept: {
          'text/html': ['.html', '.htm'],
          'text/css': ['.css'],
          'text/javascript': ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
          'application/json': ['.json'],
          'text/plain': ['.txt', '.md', '.py', '.svg'],
        },
      },
    ],
    multiple: false,
  });

  const file = await handle.getFile();
  const content = await file.text();
  return {
    handle,
    name: handle.name,
    content,
  };
}

// Pick a directory/folder on PC
export async function pickLocalDirectory(): Promise<{ dirHandle: any; dirName: string; files: LocalFileItem[]; primaryHtml?: LocalFileItem }> {
  if (typeof (window as any).showDirectoryPicker !== 'function') {
    throw new Error('Directory Picker is not supported on this browser/device.');
  }

  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
  });

  const files: LocalFileItem[] = [];

  async function scanDirectory(handle: any, currentPath = '') {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        // Skip hidden files, system files, or huge lockfiles
        if (entry.name.startsWith('.') || entry.name === 'package-lock.json' || entry.name.endsWith('.lock')) {
          continue;
        }
        try {
          const file = await entry.getFile();
          files.push({
            name: entry.name,
            path: currentPath ? `${currentPath}/${entry.name}` : entry.name,
            size: file.size,
            type: file.type || 'text/plain',
            handle: entry,
            lastModified: file.lastModified,
          });
        } catch (e) {
          console.warn('[LocalWorkspace] Could not read file info for:', entry.name);
        }
      } else if (entry.kind === 'directory') {
        // Skip node_modules, .git, dist, build, etc.
        if (['node_modules', '.git', 'dist', 'build', '.next', '.vscode'].includes(entry.name)) {
          continue;
        }
        if (files.length < 150) { // Safety bound
          await scanDirectory(entry, currentPath ? `${currentPath}/${entry.name}` : entry.name);
        }
      }
    }
  }

  await scanDirectory(dirHandle);

  // Find primary HTML file (prefer index.html, then any .html)
  let primaryHtml = files.find(f => f.name.toLowerCase() === 'index.html');
  if (!primaryHtml) {
    primaryHtml = files.find(f => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm'));
  }

  return {
    dirHandle,
    dirName: dirHandle.name,
    files,
    primaryHtml,
  };
}

// Helper to extract the most relevant code block from AI response text
export function extractCodeBlockFromResponse(responseText: string, expectedExt = 'html'): string | null {
  if (!responseText) return null;

  // 1. Try markdown fenced code block with specific language e.g. ```html ... ```
  const langRegex = new RegExp(`\`\`\`(?:${expectedExt}|xml|jsx|tsx|javascript|typescript|css|html)\\s*\\n([\\s\\S]*?)\`\`\``, 'i');
  const match = responseText.match(langRegex);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }

  // 2. Try any fenced code block ``` ... ``` that has HTML or standard code tags
  const anyBlockRegex = /```[\w-]*\s*\n([\s\S]*?)```/g;
  let candidate: string | null = null;
  let maxLen = 0;
  let m;
  while ((m = anyBlockRegex.exec(responseText)) !== null) {
    const code = m[1].trim();
    if (code.length > maxLen && (code.includes('<') || code.includes('{') || code.includes('function') || code.includes('import'))) {
      candidate = code;
      maxLen = code.length;
    }
  }

  if (candidate) return candidate;

  // 3. If the entire response starts with <!DOCTYPE html> or <html>
  if (/^\s*<!DOCTYPE html/i.test(responseText) || /^\s*<html/i.test(responseText)) {
    return responseText.trim();
  }

  return null;
}

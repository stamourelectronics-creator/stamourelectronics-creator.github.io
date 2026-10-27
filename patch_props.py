import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'interface BrowserViewProps \{',
    r'interface BrowserViewProps {\n  customBackgroundUrl?: string;',
    content,
    count=1
)

content = re.sub(
    r'export function BrowserView\(\{ onGoToChat, isSidebarOpen, onToggleSidebar, theme, userNickname, onShowAuthModal \}: BrowserViewProps\) \{',
    r'export function BrowserView({ onGoToChat, isSidebarOpen, onToggleSidebar, theme, userNickname, onShowAuthModal, customBackgroundUrl }: BrowserViewProps) {',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)

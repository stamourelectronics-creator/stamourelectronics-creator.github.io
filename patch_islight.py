import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'export function BrowserView\(\{ onGoToChat, isSidebarOpen, onToggleSidebar, theme, userNickname, onShowAuthModal, customBackgroundUrl \}: BrowserViewProps\) \{\n',
    r'export function BrowserView({ onGoToChat, isSidebarOpen, onToggleSidebar, theme, userNickname, onShowAuthModal, customBackgroundUrl }: BrowserViewProps) {\n  const isLight = theme === \'light_glass\';\n',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)

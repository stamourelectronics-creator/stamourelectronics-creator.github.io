import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'(<BrowserView \s*\n\s*onGoToChat=\{[^}]+\} \s*\n\s*isSidebarOpen=\{isSidebarOpen\}\s*\n\s*onToggleSidebar=\{[^}]+\}\s*\n\s*theme=\{settings\.theme\}\s*\n\s*userNickname=\{settings\.userNickname\})',
    re.DOTALL
)

replacement = r'\1\n            customBackgroundUrl={settings.customBackgroundUrl}'

new_content = pattern.sub(replacement, content)

with open('src/App.tsx', 'w') as f:
    f.write(new_content)

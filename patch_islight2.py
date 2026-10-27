import re
with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'export function BrowserView\(\{([^}]+)\}: BrowserViewProps\) \{',
    r'export function BrowserView({\1, customBackgroundUrl}: BrowserViewProps) {\n  const isLight = theme === \'light_glass\';',
    content,
    count=1
)

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)

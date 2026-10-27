import re
with open('src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

content = content.replace('}`} />`} />', '}`} />')
content = content.replace('}`}                />`}                />', '}`}                />')
# Let's just do a simple string replace for `}`} />`} />` or similar
content = re.sub(r'\}\s*`\}\s*\/\>\s*`\}\s*\/\>', r'}`}\n                />', content)
with open('src/components/SettingsModal.tsx', 'w') as f:
    f.write(content)

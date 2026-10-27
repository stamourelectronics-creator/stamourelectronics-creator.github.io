with open('src/components/BrowserView.tsx', 'r') as f:
    content = f.read()

content = content.replace("const isLight = theme === \\'light_glass\\';", "const isLight = theme === 'light_glass';")

with open('src/components/BrowserView.tsx', 'w') as f:
    f.write(content)

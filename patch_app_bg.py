import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(
    r'return \(\s*<div className={`flex h-screen w-screen overflow-hidden \$\{currentTheme\.outerBg\} \$\{currentTheme\.text\} transition-colors duration-300 font-sans`}>',
    re.DOTALL
)

replacement = """const customBgStyle = settings.customBackgroundUrl ? {
    backgroundImage: `url(${settings.customBackgroundUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  } : {};

  return (
    <div 
      className={`flex h-screen w-screen overflow-hidden ${settings.customBackgroundUrl ? '' : currentTheme.outerBg} ${currentTheme.text} transition-colors duration-300 font-sans`}
      style={customBgStyle}
    >"""

new_content = pattern.sub(replacement, content)

with open('src/App.tsx', 'w') as f:
    f.write(new_content)

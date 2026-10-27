const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /const \[assistSetting, setAssistSetting\] = useState<'never' \| 'on_demand' \| 'sometimes' \| 'often'>\('sometimes'\);\s*const \[showRainbowRing, setShowRainbowRing\] = useState\(true\);\s*useEffect\(\(\) => \{\s*if \(assistOpen\) \{\s*setShowRainbowRing\(true\);\s*const timer = setTimeout\(\(\) => setShowRainbowRing\(false\), 5000\);\s*return \(\) => clearTimeout\(timer\);\s*\}\s*\}, \[assistOpen, activeSearch\]\);/m;

const replacement = `const [assistSetting, setAssistSetting] = useState<'never' | 'on_demand' | 'sometimes' | 'often'>('sometimes');
  const [showRainbowRing, setShowRainbowRing] = useState(true);`;

code = code.replace(regex, replacement);

const effectStr = `  const [assistOpen, setAssistOpen] = useState(true);`;
const effectReplacement = `  const [assistOpen, setAssistOpen] = useState(true);

  useEffect(() => {
    if (assistOpen) {
      setShowRainbowRing(true);
      const timer = setTimeout(() => setShowRainbowRing(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [assistOpen, activeSearch]);`;

code = code.replace(effectStr, effectReplacement);

fs.writeFileSync('src/components/BrowserView.tsx', code);

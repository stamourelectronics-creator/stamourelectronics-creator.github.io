const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /<div className="p-6 bg-white shadow-xl rounded-\[2rem\] space-y-4 relative animate-slide-up select-text animate-fade-in rainbow-ring-active">/;

const replace = `<div className={\`p-6 bg-white shadow-xl rounded-[2rem] space-y-4 relative animate-slide-up select-text animate-fade-in \${showRainbowRing ? 'rainbow-ring-active' : ''}\`}>`;

code = code.replace(regex, replace);

const stateRegex = /const \[assistSetting, setAssistSetting\] = useState<'never' \| 'on_demand' \| 'sometimes' \| 'often'>\('often'\);/;
const stateReplace = `const [assistSetting, setAssistSetting] = useState<'never' | 'on_demand' | 'sometimes' | 'often'>('often');
  const [showRainbowRing, setShowRainbowRing] = useState(true);

  useEffect(() => {
    if (assistOpen) {
      setShowRainbowRing(true);
      const timer = setTimeout(() => setShowRainbowRing(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [assistOpen, activeSearch]);`;

code = code.replace(stateRegex, stateReplace);

// Also remove the spinning star on IsaiahAI search assistant since user said "circling star is gone"
const starRegex = /<Sparkles className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} \/>/g;
const starReplace = `<Sparkles className="w-4 h-4 text-indigo-600" />`;
code = code.replace(starRegex, starReplace);

fs.writeFileSync('src/components/BrowserView.tsx', code);

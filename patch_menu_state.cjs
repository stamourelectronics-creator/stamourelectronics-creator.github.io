const fs = require('fs');
let code = fs.readFileSync('src/components/BrowserView.tsx', 'utf-8');

const regex = /const \[assistSetting, setAssistSetting\] = useState<'never' \| 'on_demand' \| 'sometimes' \| 'often'>\('sometimes'\);/;

const replacement = `const [assistSetting, setAssistSetting] = useState<'never' | 'on_demand' | 'sometimes' | 'often'>('sometimes');
  // Search Settings State
  const [appearanceLayout, setAppearanceLayout] = useState<'standard' | 'dense'>('dense');
  const [urlPlacement, setUrlPlacement] = useState<'Above Title' | 'Below Title'>('Above Title');
  const [showSiteNames, setShowSiteNames] = useState(true);
  const [showSiteIcons, setShowSiteIcons] = useState(true);
  const [searchFontSize, setSearchFontSize] = useState<'Small' | 'Medium' | 'Large'>('Large');
  const [searchFont, setSearchFont] = useState('Duck Sans (default)');
  const [compactResults, setCompactResults] = useState(false);
  const [infiniteScroll, setInfiniteScroll] = useState(false);
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(false);
  const [settingsDropdown, setSettingsDropdown] = useState<'none' | 'url' | 'font_size' | 'font'>('none');
`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/BrowserView.tsx', code);

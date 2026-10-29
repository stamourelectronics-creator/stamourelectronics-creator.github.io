export interface SearchResultBox {
  title: string;
  uri: string;
  description: string;
  sourceLogo?: string;
  domain?: string;
}

export interface AttachedFile {
  name: string;
  data: string; // Base64 data URI
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  modelDisplayName?: string;
  isSearch?: boolean;
  searchType?: 'wiki' | 'isaiahsearch' | 'google';
  summaryQuery?: string;
  searchResults?: SearchResultBox[];
  loadingSearch?: boolean;
  error?: string;
  images?: string[]; // Data URIs of attached images
  attachments?: AttachedFile[]; // List of attached files and images
  isDoc?: boolean;
  docTitle?: string;
  isSlides?: boolean;
  slidesData?: { title: string; slides: { title: string; bulletPoints: string[] }[] };
  googleDocId?: string;
  googleSlideId?: string;
  thinking?: string;
  sources?: { title: string; uri: string }[];
  localFileEdited?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  category?: 'Work' | 'Personal' | 'Coding' | 'Other';
}

export type ThemeType = 'charcoal' | 'gold' | 'slate' | 'matrix' | 'crimson' | 'light_glass';

export type BubbleStyleType = 'minimal' | 'modern' | 'classic';

export interface UserSettings {
  theme: ThemeType;
  fontSize: 'sm' | 'md' | 'lg';
  bubbleStyle: BubbleStyleType;
  userAvatarSymbol: string;
  aiAvatarSymbol: string;
  userNickname: string;
  driveClearMatchingRule?: 'name_size' | 'name_checksum' | 'name_only';
  driveClearKeepPreference?: 'oldest' | 'newest';
  customBackgroundUrl?: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  skin: string;
}

export interface CreativeGameConcept {
  title: string;
  genre: string;
  tagline: string;
  rules: string[];
  codeHtml: string;
}

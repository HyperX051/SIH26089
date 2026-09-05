import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LangCode = 'en' | 'hi' | 'ta' | 'kn' | 'ml' | 'te' | 'bn' | 'mr' | 'gu' | 'pa';

export const LANGUAGES: { code: LangCode; name: string; native: string }[] = [
  { code: 'en', name: 'English',    native: 'English'    },
  { code: 'hi', name: 'Hindi',      native: 'हिंदी'       },
  { code: 'ta', name: 'Tamil',      native: 'தமிழ்'       },
  { code: 'kn', name: 'Kannada',    native: 'ಕನ್ನಡ'      },
  { code: 'ml', name: 'Malayalam',  native: 'മലയാളം'     },
  { code: 'te', name: 'Telugu',     native: 'తెలుగు'      },
  { code: 'bn', name: 'Bengali',    native: 'বাংলা'      },
  { code: 'mr', name: 'Marathi',    native: 'मराठी'      },
  { code: 'gu', name: 'Gujarati',   native: 'ગુજરાતી'    },
  { code: 'pa', name: 'Punjabi',    native: 'ਪੰਜਾਬੀ'     },
];

interface LangState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

export const useLanguageStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'fixnow-language' }
  )
);

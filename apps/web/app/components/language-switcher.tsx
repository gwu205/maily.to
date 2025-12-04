// components/language-switcher.tsx
import type { LucideIcon } from 'lucide-react';
import { LanguagesIcon } from 'lucide-react';
import { Button } from './ui/button';

export type Language = 'en' | 'ja';

interface LanguageOption {
  value: Language;
  label: string;
  icon?: LucideIcon;
}

const languageOptions: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

interface LanguageSwitcherProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSwitcher({
  currentLanguage,
  onLanguageChange,
}: LanguageSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <LanguagesIcon className="h-4 w-4" />
      <div className="flex rounded-md bg-gray-100 p-1 dark:bg-gray-800">
        {languageOptions.map((lang) => (
          <Button
            key={lang.value}
            type="button"
            variant={currentLanguage === lang.value ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => onLanguageChange(lang.value)}
          >
            {lang.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

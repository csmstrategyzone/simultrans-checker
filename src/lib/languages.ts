/**
 * The 20 languages SimulTrans most commonly handles, grouped by region for the
 * searchable dropdown. Single source of truth shared by the tool card and the
 * analyze API — `value` is what gets sent to the server and named in the prompt.
 */

export type Language = { value: string; label: string };
export type LanguageGroup = { region: string; options: Language[] };

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    region: "European",
    options: [
      { value: "French", label: "French (fr-FR)" },
      { value: "German", label: "German (de-DE)" },
      { value: "Spanish", label: "Spanish (es-ES)" },
      { value: "Italian", label: "Italian (it-IT)" },
      { value: "Portuguese (Portugal)", label: "Portuguese Portugal (pt-PT)" },
      { value: "Dutch", label: "Dutch (nl-NL)" },
      { value: "Polish", label: "Polish (pl-PL)" },
      { value: "Russian", label: "Russian (ru-RU)" },
      { value: "Swedish", label: "Swedish (sv-SE)" },
      { value: "Turkish", label: "Turkish (tr-TR)" },
    ],
  },
  {
    region: "Asian",
    options: [
      { value: "Japanese", label: "Japanese (ja-JP)" },
      { value: "Simplified Chinese", label: "Simplified Chinese (zh-CN)" },
      { value: "Traditional Chinese", label: "Traditional Chinese (zh-TW)" },
      { value: "Korean", label: "Korean (ko-KR)" },
      { value: "Hindi", label: "Hindi (hi-IN)" },
      { value: "Thai", label: "Thai (th-TH)" },
      { value: "Vietnamese", label: "Vietnamese (vi-VN)" },
    ],
  },
  {
    region: "Americas",
    options: [
      { value: "Brazilian Portuguese", label: "Brazilian Portuguese (pt-BR)" },
      { value: "Latin American Spanish", label: "Latin American Spanish (es-MX)" },
    ],
  },
  {
    region: "Middle East",
    options: [{ value: "Arabic", label: "Arabic (ar-SA)" }],
  },
];

export const LANGUAGES: Language[] = LANGUAGE_GROUPS.flatMap((g) => g.options);

export const LANGUAGE_VALUES: string[] = LANGUAGES.map((l) => l.value);

export function isSupportedLanguage(value: string): boolean {
  return LANGUAGE_VALUES.includes(value);
}

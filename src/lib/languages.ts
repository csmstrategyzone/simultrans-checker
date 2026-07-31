/**
 * The 150 languages SimulTrans offers, grouped by region for the searchable
 * dropdown. Single source of truth shared by the tool card and the analyze API
 * — `value` is what gets sent to the server and named in the prompt, so it is
 * the plain English language name, not a code.
 *
 * Weighting is US/European business-translation demand rather than raw
 * native-speaker counts: every European language is covered, Indian regional
 * languages are capped at the six with the largest global reach, and Chinese is
 * limited to Mandarin and Cantonese.
 *
 * One entry per language — no regional variants. Chinese is split only by
 * script (Simplified vs Traditional), because that changes the rendered output
 * and the font the PDF must embed, not merely the locale.
 *
 * Options are alphabetical by label within each region group.
 */

export type Language = { value: string; label: string };
export type LanguageGroup = { region: string; options: Language[] };

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    region: "Western Europe",
    options: [
      { value: "Basque", label: "Basque (eu)" },
      { value: "Breton", label: "Breton (br)" },
      { value: "Catalan", label: "Catalan (ca)" },
      { value: "Corsican", label: "Corsican (co)" },
      { value: "Dutch", label: "Dutch (nl)" },
      { value: "English", label: "English (en)" },
      { value: "French", label: "French (fr)" },
      { value: "Frisian", label: "Frisian (fy)" },
      { value: "Galician", label: "Galician (gl)" },
      { value: "German", label: "German (de)" },
      { value: "Irish", label: "Irish (ga)" },
      { value: "Italian", label: "Italian (it)" },
      { value: "Luxembourgish", label: "Luxembourgish (lb)" },
      { value: "Maltese", label: "Maltese (mt)" },
      { value: "Manx", label: "Manx (gv)" },
      { value: "Occitan", label: "Occitan (oc)" },
      { value: "Portuguese", label: "Portuguese (pt)" },
      { value: "Romansh", label: "Romansh (rm)" },
      { value: "Sardinian", label: "Sardinian (sc)" },
      { value: "Scottish Gaelic", label: "Scottish Gaelic (gd)" },
      { value: "Spanish", label: "Spanish (es)" },
      { value: "Welsh", label: "Welsh (cy)" },
    ],
  },
  {
    region: "Northern Europe",
    options: [
      { value: "Danish", label: "Danish (da)" },
      { value: "Estonian", label: "Estonian (et)" },
      { value: "Faroese", label: "Faroese (fo)" },
      { value: "Finnish", label: "Finnish (fi)" },
      { value: "Icelandic", label: "Icelandic (is)" },
      { value: "Latvian", label: "Latvian (lv)" },
      { value: "Lithuanian", label: "Lithuanian (lt)" },
      { value: "Northern Sami", label: "Northern Sami (se)" },
      { value: "Norwegian", label: "Norwegian (no)" },
      { value: "Swedish", label: "Swedish (sv)" },
    ],
  },
  {
    region: "Central and Eastern Europe",
    options: [
      { value: "Albanian", label: "Albanian (sq)" },
      { value: "Belarusian", label: "Belarusian (be)" },
      { value: "Bosnian", label: "Bosnian (bs)" },
      { value: "Bulgarian", label: "Bulgarian (bg)" },
      { value: "Croatian", label: "Croatian (hr)" },
      { value: "Czech", label: "Czech (cs)" },
      { value: "Greek", label: "Greek (el)" },
      { value: "Hungarian", label: "Hungarian (hu)" },
      { value: "Macedonian", label: "Macedonian (mk)" },
      { value: "Moldovan", label: "Moldovan (ro-MD)" },
      { value: "Montenegrin", label: "Montenegrin (cnr)" },
      { value: "Polish", label: "Polish (pl)" },
      { value: "Romanian", label: "Romanian (ro)" },
      { value: "Russian", label: "Russian (ru)" },
      { value: "Serbian", label: "Serbian (sr)" },
      { value: "Slovak", label: "Slovak (sk)" },
      { value: "Slovenian", label: "Slovenian (sl)" },
      { value: "Sorbian", label: "Sorbian (wen)" },
      { value: "Ukrainian", label: "Ukrainian (uk)" },
      { value: "Yiddish", label: "Yiddish (yi)" },
    ],
  },
  {
    region: "Middle East and Caucasus",
    options: [
      { value: "Arabic", label: "Arabic (ar)" },
      { value: "Armenian", label: "Armenian (hy)" },
      { value: "Azerbaijani", label: "Azerbaijani (az)" },
      { value: "Dari", label: "Dari (prs)" },
      { value: "Georgian", label: "Georgian (ka)" },
      { value: "Hebrew", label: "Hebrew (he)" },
      { value: "Kurdish", label: "Kurdish (ku)" },
      { value: "Pashto", label: "Pashto (ps)" },
      { value: "Persian", label: "Persian (fa)" },
      { value: "Turkish", label: "Turkish (tr)" },
    ],
  },
  {
    region: "Central and South Asia",
    options: [
      { value: "Bengali", label: "Bengali (bn)" },
      { value: "Gujarati", label: "Gujarati (gu)" },
      { value: "Hindi", label: "Hindi (hi)" },
      { value: "Kannada", label: "Kannada (kn)" },
      { value: "Kazakh", label: "Kazakh (kk)" },
      { value: "Kyrgyz", label: "Kyrgyz (ky)" },
      { value: "Malayalam", label: "Malayalam (ml)" },
      { value: "Marathi", label: "Marathi (mr)" },
      { value: "Mongolian", label: "Mongolian (mn)" },
      { value: "Nepali", label: "Nepali (ne)" },
      { value: "Punjabi", label: "Punjabi (pa)" },
      { value: "Sinhala", label: "Sinhala (si)" },
      { value: "Tajik", label: "Tajik (tg)" },
      { value: "Tamil", label: "Tamil (ta)" },
      { value: "Telugu", label: "Telugu (te)" },
      { value: "Turkmen", label: "Turkmen (tk)" },
      { value: "Urdu", label: "Urdu (ur)" },
      { value: "Uzbek", label: "Uzbek (uz)" },
    ],
  },
  {
    region: "East and Southeast Asia",
    options: [
      { value: "Burmese", label: "Burmese (my)" },
      { value: "Cantonese", label: "Cantonese (yue)" },
      { value: "Cebuano", label: "Cebuano (ceb)" },
      { value: "Filipino", label: "Filipino (fil)" },
      { value: "Hiligaynon", label: "Hiligaynon (hil)" },
      { value: "Ilocano", label: "Ilocano (ilo)" },
      { value: "Indonesian", label: "Indonesian (id)" },
      { value: "Japanese", label: "Japanese (ja)" },
      { value: "Javanese", label: "Javanese (jv)" },
      { value: "Khmer", label: "Khmer (km)" },
      { value: "Korean", label: "Korean (ko)" },
      { value: "Lao", label: "Lao (lo)" },
      { value: "Malay", label: "Malay (ms)" },
      { value: "Simplified Chinese", label: "Simplified Chinese (zh-Hans)" },
      { value: "Sundanese", label: "Sundanese (su)" },
      { value: "Thai", label: "Thai (th)" },
      { value: "Traditional Chinese", label: "Traditional Chinese (zh-Hant)" },
      { value: "Vietnamese", label: "Vietnamese (vi)" },
    ],
  },
  {
    region: "Africa",
    options: [
      { value: "Afrikaans", label: "Afrikaans (af)" },
      { value: "Akan", label: "Akan (ak)" },
      { value: "Amharic", label: "Amharic (am)" },
      { value: "Bambara", label: "Bambara (bm)" },
      { value: "Chichewa", label: "Chichewa (ny)" },
      { value: "Ewe", label: "Ewe (ee)" },
      { value: "Fula", label: "Fula (ff)" },
      { value: "Ga", label: "Ga (gaa)" },
      { value: "Hausa", label: "Hausa (ha)" },
      { value: "Igbo", label: "Igbo (ig)" },
      { value: "Kinyarwanda", label: "Kinyarwanda (rw)" },
      { value: "Kirundi", label: "Kirundi (rn)" },
      { value: "Lingala", label: "Lingala (ln)" },
      { value: "Luganda", label: "Luganda (lg)" },
      { value: "Luo", label: "Luo (luo)" },
      { value: "Malagasy", label: "Malagasy (mg)" },
      { value: "Ndebele", label: "Ndebele (nd)" },
      { value: "Oromo", label: "Oromo (om)" },
      { value: "Sepedi", label: "Sepedi (nso)" },
      { value: "Sesotho", label: "Sesotho (st)" },
      { value: "Shona", label: "Shona (sn)" },
      { value: "Somali", label: "Somali (so)" },
      { value: "Swahili", label: "Swahili (sw)" },
      { value: "Tigrinya", label: "Tigrinya (ti)" },
      { value: "Tsonga", label: "Tsonga (ts)" },
      { value: "Tswana", label: "Tswana (tn)" },
      { value: "Twi", label: "Twi (tw)" },
      { value: "Umbundu", label: "Umbundu (umb)" },
      { value: "Wolof", label: "Wolof (wo)" },
      { value: "Xhosa", label: "Xhosa (xh)" },
      { value: "Yoruba", label: "Yoruba (yo)" },
      { value: "Zulu", label: "Zulu (zu)" },
    ],
  },
  {
    region: "Americas",
    options: [
      { value: "Aymara", label: "Aymara (ay)" },
      { value: "Greenlandic", label: "Greenlandic (kl)" },
      { value: "Guarani", label: "Guarani (gn)" },
      { value: "Haitian Creole", label: "Haitian Creole (ht)" },
      { value: "Nahuatl", label: "Nahuatl (nah)" },
      { value: "Navajo", label: "Navajo (nv)" },
      { value: "Quechua", label: "Quechua (qu)" },
    ],
  },
  {
    region: "Pacific",
    options: [
      { value: "Chamorro", label: "Chamorro (ch)" },
      { value: "Fijian", label: "Fijian (fj)" },
      { value: "Hawaiian", label: "Hawaiian (haw)" },
      { value: "Maori", label: "Maori (mi)" },
      { value: "Marshallese", label: "Marshallese (mh)" },
      { value: "Palauan", label: "Palauan (pau)" },
      { value: "Samoan", label: "Samoan (sm)" },
      { value: "Tahitian", label: "Tahitian (ty)" },
      { value: "Tok Pisin", label: "Tok Pisin (tpi)" },
      { value: "Tongan", label: "Tongan (to)" },
    ],
  },
  {
    region: "Classical and constructed",
    options: [
      { value: "Esperanto", label: "Esperanto (eo)" },
      { value: "Latin", label: "Latin (la)" },
      { value: "Sanskrit", label: "Sanskrit (sa)" },
    ],
  },
];

export const LANGUAGES: Language[] = LANGUAGE_GROUPS.flatMap((g) => g.options);

export const LANGUAGE_VALUES: string[] = LANGUAGES.map((l) => l.value);

export function isSupportedLanguage(value: string): boolean {
  return LANGUAGE_VALUES.includes(value);
}

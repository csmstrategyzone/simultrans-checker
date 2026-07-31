import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

/**
 * PDF font registration.
 *
 * react-pdf ships with the PDF core fonts only (Helvetica, Times, Courier),
 * none of which carry glyphs outside Latin-1. Rendering Hindi, Japanese,
 * Arabic, Chinese, Korean, Thai or Hebrew with those fonts produces garbage
 * glyphs, so every script we offer needs a real font registered here.
 *
 * The faces are vendored in public/fonts rather than fetched from a CDN: a PDF
 * request must not depend on a third party being up. Only TTF/OTF work, react-pdf
 * cannot read woff2.
 *
 * next.config.ts has an outputFileTracingIncludes entry for /api/report/generate
 * so these files are traced into the serverless bundle. Without it the route
 * builds fine and then fails at runtime with ENOENT.
 *
 * IMPORTANT, the CJK faces are 9 to 18 MB each. Loading all of them on every
 * request would be wasteful, so script fonts are registered lazily: a report
 * only reads the one face its target language needs.
 */

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

/**
 * Resolve a font file, failing loudly if it is not on disk.
 *
 * Font.register() only records the path, it does not read the file, so a
 * missing face would otherwise stay silent until renderToBuffer walks the tree
 * and fails with something far less specific. Checking here means a bad path
 * throws during registration, which is what lets the retry guards below stay
 * unset so the next request can recover.
 */
function face(file: string): string {
  const resolved = path.join(FONT_DIR, file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`[report-fonts] font file missing: ${resolved}`);
  }
  return resolved;
}

export const HEADING_FONT = "ITCFranklinGothic";
export const BODY_FONT = "MyriadPro";
export const MONO_FONT = "IBMPlexMono";
export const LATIN_FALLBACK = "NotoSans";

/**
 * Target language to the font that can actually draw its script. Anything not
 * listed (French, Russian, Vietnamese, Turkish, ...) is Latin or Cyrillic and
 * is covered by Noto Sans.
 *
 * Keyed by the language NAME, not a BCP-47 code: the PDF route is handed
 * `data.language`, which is the `value` field from lib/languages.ts — the plain
 * English name. A code-keyed map would silently never match and every
 * non-Latin report would fall back to Latin Noto Sans.
 *
 * Several languages share one script face, so entries intentionally repeat a
 * family: Devanagari covers Hindi, Marathi, Nepali and Sanskrit; Arabic covers
 * Persian, Urdu, Pashto, Dari and Kurdish; Ethiopic covers Amharic and Tigrinya.
 */
const SCRIPT_FONTS: Record<string, { family: string; file: string }> = {
  // ── Devanagari ────────────────────────────────────────
  Hindi: { family: "NotoSansDevanagari", file: "NotoSansDevanagari-Regular.ttf" },
  Marathi: { family: "NotoSansDevanagari", file: "NotoSansDevanagari-Regular.ttf" },
  Nepali: { family: "NotoSansDevanagari", file: "NotoSansDevanagari-Regular.ttf" },
  Sanskrit: { family: "NotoSansDevanagari", file: "NotoSansDevanagari-Regular.ttf" },
  // ── CJK ───────────────────────────────────────────────
  Japanese: { family: "NotoSansJP", file: "NotoSansJP-Regular.ttf" },
  "Simplified Chinese": { family: "NotoSansSC", file: "NotoSansSC-Regular.ttf" },
  "Traditional Chinese": { family: "NotoSansTC", file: "NotoSansTC-Regular.ttf" },
  Cantonese: { family: "NotoSansTC", file: "NotoSansTC-Regular.ttf" },
  Korean: { family: "NotoSansKR", file: "NotoSansKR-Regular.ttf" },
  // ── Arabic script ─────────────────────────────────────
  Arabic: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Persian: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Urdu: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Pashto: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Dari: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Kurdish: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  // ── Hebrew script ─────────────────────────────────────
  Hebrew: { family: "NotoSansHebrew", file: "NotoSansHebrew-Regular.ttf" },
  Yiddish: { family: "NotoSansHebrew", file: "NotoSansHebrew-Regular.ttf" },
  // ── Southeast Asian ───────────────────────────────────
  Thai: { family: "NotoSansThai", file: "NotoSansThai-Regular.ttf" },
  Lao: { family: "NotoSansLao", file: "NotoSansLao-Regular.ttf" },
  Khmer: { family: "NotoSansKhmer", file: "NotoSansKhmer-Regular.ttf" },
  Burmese: { family: "NotoSansMyanmar", file: "NotoSansMyanmar-Regular.ttf" },
  // ── South Asian ───────────────────────────────────────
  Bengali: { family: "NotoSansBengali", file: "NotoSansBengali-Regular.ttf" },
  Punjabi: { family: "NotoSansGurmukhi", file: "NotoSansGurmukhi-Regular.ttf" },
  Gujarati: { family: "NotoSansGujarati", file: "NotoSansGujarati-Regular.ttf" },
  Tamil: { family: "NotoSansTamil", file: "NotoSansTamil-Regular.ttf" },
  Telugu: { family: "NotoSansTelugu", file: "NotoSansTelugu-Regular.ttf" },
  Kannada: { family: "NotoSansKannada", file: "NotoSansKannada-Regular.ttf" },
  Malayalam: { family: "NotoSansMalayalam", file: "NotoSansMalayalam-Regular.ttf" },
  Sinhala: { family: "NotoSansSinhala", file: "NotoSansSinhala-Regular.ttf" },
  // ── Caucasus and Horn of Africa ───────────────────────
  Georgian: { family: "NotoSansGeorgian", file: "NotoSansGeorgian-Regular.ttf" },
  Armenian: { family: "NotoSansArmenian", file: "NotoSansArmenian-Regular.ttf" },
  Amharic: { family: "NotoSansEthiopic", file: "NotoSansEthiopic-Regular.ttf" },
  Tigrinya: { family: "NotoSansEthiopic", file: "NotoSansEthiopic-Regular.ttf" },
};

/**
 * Scripts whose conjunct forms crash the PDF renderer.
 *
 * @react-pdf/renderer's fontkit throws "Cannot read properties of null
 * (reading 'xCoordinate')" while positioning combining marks in Gurmukhi and
 * Malayalam — specifically the virama sequences (U+0A4D, U+0D4D) that ordinary
 * prose in both languages is full of. Base letters and vowel signs render, so
 * the failure only shows up on real sentences.
 *
 * Verified against four font builds each (notofonts hinted/unhinted and the
 * legacy noto-fonts hinted/unhinted), all failing identically — this is the
 * renderer, not the font file, so a different face will not fix it.
 *
 * Every other Indic script we ship (Devanagari, Bengali, Gujarati, Tamil,
 * Telugu, Kannada, Sinhala) renders conjuncts correctly.
 *
 * These languages stay selectable: the on-screen analysis is unaffected. Only
 * the PDF export is refused, with a specific message instead of a 500.
 */
export const PDF_UNSUPPORTED_LANGUAGES = new Set(["Punjabi", "Malayalam"]);

let baseRegistered = false;
const registeredScripts = new Set<string>();

/**
 * Brand faces plus the Latin/Cyrillic fallback. Cheap, always needed.
 *
 * The guard is only set once every face has registered. Setting it up front
 * meant a single failed load poisoned the process: later requests skipped
 * registration, the fonts were still absent, and PDF generation stayed broken
 * until restart. Leaving the flag false on failure lets the next request retry.
 */
export function registerBaseFonts() {
  if (baseRegistered) return;

  try {
    // Headings. Official brand face (ITC Franklin Gothic), OTF read directly
    // by fontkit. Book/Medium/Demi/Heavy give real 400/500/600/700 weights.
    Font.register({
      family: HEADING_FONT,
      fonts: [
        { src: face("ITCFranklinGothicStd-Book.otf"), fontWeight: 400 },
        { src: face("ITCFranklinGothicStd-Med.otf"), fontWeight: 500 },
        { src: face("ITCFranklinGothicStd-Demi.otf"), fontWeight: 600 },
        { src: face("ITCFranklinGothicStd-Hvy.otf"), fontWeight: 700 },
      ],
    });

    // Body. Official brand face (Myriad Pro). Regular/Semibold/Bold plus the
    // dedicated italic so emphasis renders as a true italic, not a synthetic slant.
    Font.register({
      family: BODY_FONT,
      fonts: [
        { src: face("MyriadPro-Regular.otf"), fontWeight: 400 },
        { src: face("MyriadPro-It.otf"), fontWeight: 400, fontStyle: "italic" },
        { src: face("MyriadPro-Semibold.otf"), fontWeight: 600 },
        { src: face("MyriadPro-Bold.otf"), fontWeight: 700 },
      ],
    });

    // Mono, for the raw source-content block.
    Font.register({
      family: MONO_FONT,
      fonts: [{ src: face("IBMPlexMono-Regular.ttf"), fontWeight: 400 }],
    });

    // Latin + Cyrillic fallback for target languages with no dedicated face.
    Font.register({
      family: LATIN_FALLBACK,
      fonts: [{ src: face("NotoSans-Regular.ttf"), fontWeight: 400 }],
    });

    baseRegistered = true;
  } catch (err) {
    // Flag deliberately left false so the next request tries again.
    baseRegistered = false;
    throw err;
  }
}

/**
 * The family the translation block should use for `language`, registering it on
 * first use. Falls back to Noto Sans for Latin and Cyrillic targets.
 */
export function registerFontForLanguage(language: string): string {
  registerBaseFonts();

  const script = SCRIPT_FONTS[language];
  if (!script) return LATIN_FALLBACK;

  if (!registeredScripts.has(script.family)) {
    // Same ordering rule as registerBaseFonts: mark it registered only once it
    // actually is, so a failure here does not permanently disable the script.
    Font.register({
      family: script.family,
      fonts: [{ src: face(script.file), fontWeight: 400 }],
    });
    registeredScripts.add(script.family);
  }

  return script.family;
}

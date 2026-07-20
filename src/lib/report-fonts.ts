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

export const HEADING_FONT = "BarlowCondensed";
export const BODY_FONT = "SourceSans3";
export const MONO_FONT = "IBMPlexMono";
export const LATIN_FALLBACK = "NotoSans";

/**
 * Target language to the font that can actually draw its script. Anything not
 * listed (French, Russian, Vietnamese, Turkish, ...) is Latin or Cyrillic and
 * is covered by Noto Sans.
 */
const SCRIPT_FONTS: Record<string, { family: string; file: string }> = {
  Hindi: {
    family: "NotoSansDevanagari",
    file: "NotoSansDevanagari-Regular.ttf",
  },
  Japanese: { family: "NotoSansJP", file: "NotoSansJP-Regular.ttf" },
  "Simplified Chinese": { family: "NotoSansSC", file: "NotoSansSC-Regular.ttf" },
  "Traditional Chinese": { family: "NotoSansTC", file: "NotoSansTC-Regular.ttf" },
  Korean: { family: "NotoSansKR", file: "NotoSansKR-Regular.ttf" },
  Arabic: { family: "NotoSansArabic", file: "NotoSansArabic-Regular.ttf" },
  Thai: { family: "NotoSansThai", file: "NotoSansThai-Regular.ttf" },
  // Not currently offered in the language dropdown, registered so that adding
  // it to languages.ts is the only change needed.
  Hebrew: { family: "NotoSansHebrew", file: "NotoSansHebrew-Regular.ttf" },
};

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
    // Headings. Static cuts, so these carry real weights.
    Font.register({
      family: HEADING_FONT,
      fonts: [
        { src: face("BarlowCondensed-Medium.ttf"), fontWeight: 500 },
        { src: face("BarlowCondensed-SemiBold.ttf"), fontWeight: 600 },
        { src: face("BarlowCondensed-Bold.ttf"), fontWeight: 700 },
      ],
    });

    // Body. Adobe's static TTFs rather than the Google variable build, so bold
    // actually renders bold instead of collapsing to the default instance.
    Font.register({
      family: BODY_FONT,
      fonts: [
        { src: face("SourceSans3-Regular.ttf"), fontWeight: 400 },
        { src: face("SourceSans3-Semibold.ttf"), fontWeight: 600 },
        { src: face("SourceSans3-Bold.ttf"), fontWeight: 700 },
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

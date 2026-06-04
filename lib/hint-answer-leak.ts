export type HintLeakSeverity = "none" | "partial" | "direct";

export interface HintAnswerLeakInput {
  questionType: string;
  hint: unknown;
  answer: unknown;
  choices?: unknown[];
  slots?: string[];
}

export interface HintAnswerLeakResult {
  leaksAnswer: boolean;
  severity: HintLeakSeverity;
  reasons: string[];
  matchedTerms: string[];
  checkedTerms: string[];
}

const GENERIC_SINGLE_TOKEN_TERMS = new Set([
  "a",
  "an",
  "the",
  "yes",
  "no",
  "true",
  "false",
  "correct",
  "incorrect",
  "right",
  "wrong",
]);

const ORDINAL_WORDS = ["first", "second", "third", "fourth"];

const COMMON_TOKENS = new Set([
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "answer",
  "before",
  "between",
  "choice",
  "choices",
  "compare",
  "consider",
  "content",
  "correct",
  "described",
  "detail",
  "during",
  "each",
  "fact",
  "facts",
  "final",
  "finally",
  "first",
  "from",
  "hint",
  "into",
  "lesson",
  "look",
  "next",
  "order",
  "placing",
  "process",
  "question",
  "recall",
  "remember",
  "second",
  "sequence",
  "step",
  "steps",
  "student",
  "that",
  "then",
  "third",
  "think",
  "through",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
]);

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function tokenize(value: unknown): string[] {
  return text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+(?:\.[0-9]+)?%?/g) ?? [];
}

export function normalizeForHintLeak(value: unknown): string {
  return tokenize(value).join(" ");
}

function meaningfulTerm(termTokens: string[]): boolean {
  if (termTokens.length === 0) return false;
  if (termTokens.length === 1 && GENERIC_SINGLE_TOKEN_TERMS.has(termTokens[0])) {
    return false;
  }
  return termTokens.join("").length >= 3;
}

function stemToken(token: string): string {
  if (/\d/.test(token)) return token;
  if (token.length > 5 && token.endsWith("ing")) {
    let stem = token.slice(0, -3);
    if (stem.length > 3 && stem.at(-1) === stem.at(-2)) stem = stem.slice(0, -1);
    return stem;
  }
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function distinctiveStemSet(value: unknown): Set<string> {
  const stems = tokenize(value)
    .map(stemToken)
    .filter((token) => {
      if (COMMON_TOKENS.has(token)) return false;
      return /\d/.test(token) || token.length >= 4;
    });
  return new Set(stems);
}

function findPhrase(haystack: string[], needle: string[]): number {
  if (!meaningfulTerm(needle) || needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let matched = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function selectedChoice(answer: unknown, choices?: unknown[]): unknown {
  if (!Array.isArray(choices)) return undefined;
  const index = typeof answer === "number" ? answer : Number(answer);
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) return undefined;
  return choices[index];
}

function orderedChoices(answer: unknown, choices?: unknown[]): unknown[] {
  if (!Array.isArray(answer) || !Array.isArray(choices)) return [];
  return answer
    .map((choiceIndex) => {
      const index = typeof choiceIndex === "number" ? choiceIndex : Number(choiceIndex);
      return Number.isInteger(index) && index >= 0 && index < choices.length
        ? choices[index]
        : undefined;
    })
    .filter((value) => value != null);
}

function explicitTruthValueLeak(hint: string, answer: unknown): string | null {
  if (typeof answer !== "boolean") return null;
  const hintNorm = ` ${normalizeForHintLeak(hint)} `;
  const truePatterns = [
    /\b(?:statement|claim|question|answer)\s+(?:is|would be)\s+(?:true|correct|right)\b/,
    /\b(?:correct|right)\s+(?:statement|claim|answer)\b/,
    /\b(?:correct|right)\s+(?:answer|choice)\s+(?:is|would be)\s+true\b/,
  ];
  const falsePatterns = [
    /\b(?:statement|claim|question|answer)\s+(?:is|would be)\s+(?:false|incorrect|wrong)\b/,
    /\b(?:incorrect|wrong)\s+(?:statement|claim|answer)\b/,
    /\b(?:not|isnt|isn t)\s+true\b/,
    /\b(?:correct|right)\s+(?:answer|choice)\s+(?:is|would be)\s+false\b/,
  ];
  const patterns = answer ? truePatterns : falsePatterns;
  return patterns.some((pattern) => pattern.test(hintNorm))
    ? `hint explicitly gives the true/false verdict (${answer})`
    : null;
}

function multipleChoiceOrdinalLeak(hintTokens: string[], answer: unknown): string | null {
  const index = typeof answer === "number" ? answer : Number(answer);
  if (!Number.isInteger(index) || index < 0 || index >= ORDINAL_WORDS.length) return null;

  const hintNorm = ` ${hintTokens.join(" ")} `;
  const ordinal = ORDINAL_WORDS[index];
  const numeric = String(index + 1);
  const patterns = [
    new RegExp(`\\b${ordinal}\\s+(?:option|choice|answer)\\b`),
    new RegExp(`\\b(?:option|choice|answer)\\s+${numeric}\\b`),
  ];
  return patterns.some((pattern) => pattern.test(hintNorm))
    ? `hint identifies the correct multiple-choice position (${ordinal})`
    : null;
}

function strongerSeverity(a: HintLeakSeverity, b: HintLeakSeverity): HintLeakSeverity {
  if (a === "direct" || b === "direct") return "direct";
  if (a === "partial" || b === "partial") return "partial";
  return "none";
}

function flowSequenceRisk(hintText: string, ordered: unknown[]): { reason: string; terms: string[] } | null {
  if (ordered.length < 2) return null;

  const hintNorm = ` ${normalizeForHintLeak(hintText)} `;
  const hintStems = distinctiveStemSet(hintText);
  const stepStemSets = ordered.map(distinctiveStemSet);
  const stemCounts = new Map<string, number>();

  for (const stems of stepStemSets) {
    for (const stem of stems) stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
  }

  const matchesAny = stepStemSets
    .map((stems, index) => ({
      index,
      matched: [...stems].some((stem) => hintStems.has(stem)),
    }))
    .filter((match) => match.matched);

  const matchesUnique = stepStemSets
    .map((stems, index) => ({
      index,
      matched: [...stems].some(
        (stem) => hintStems.has(stem) && stemCounts.get(stem) === 1
      ),
    }))
    .filter((match) => match.matched);

  const strongSequenceLanguage = [
    /\bfirst\b.*\bthen\b/,
    /\bthen\b.*\bfinally\b/,
    /\bfirst\b.*\bfinally\b/,
    /\bfrom\b.+\bto\b/,
    /\bbefore\b/,
    /\bafter\b/,
    /\bchronological\s+order\b/,
    /\bcorrect\s+order\b/,
    /\bmoves?\s+from\b/,
    /\bbegins?\s+(?:by|with)\b/,
    /\bstarts?\s+(?:by|with)\b/,
    /\bends?\s+(?:by|with)\b/,
    /\bfinally\b/,
    /\blastly\b/,
  ].some((pattern) => pattern.test(hintNorm));
  const weakSequenceLanguage =
    strongSequenceLanguage ||
    /\b(?:order|sequence|workflow|pipeline|stage|process|chronological)\b/.test(hintNorm);
  const listLike = (hintText.match(/[,;]/g)?.length ?? 0) >= 2;

  if (
    (strongSequenceLanguage && matchesAny.length >= 1) ||
    (weakSequenceLanguage && matchesUnique.length >= 2) ||
    (listLike && weakSequenceLanguage && matchesAny.length >= 1)
  ) {
    const matchedIndexes = matchesUnique.length >= 2 ? matchesUnique : matchesAny;
    return {
      reason: "hint uses sequence language with answer-step terms",
      terms: matchedIndexes.map((match) => text(ordered[match.index])),
    };
  }

  return null;
}

export function detectHintAnswerLeak(input: HintAnswerLeakInput): HintAnswerLeakResult {
  const hintText = text(input.hint);
  const hintTokens = tokenize(hintText);
  const reasons: string[] = [];
  const matchedTerms: string[] = [];
  const checkedTerms: string[] = [];
  let severity: HintLeakSeverity = "none";

  const mark = (nextSeverity: Exclude<HintLeakSeverity, "none">, reason: string, term?: unknown) => {
    severity = strongerSeverity(severity, nextSeverity);
    reasons.push(reason);
    if (term != null) matchedTerms.push(text(term));
  };

  const checkDirectTerm = (term: unknown, reason: string) => {
    const termText = text(term);
    const termTokens = tokenize(termText);
    if (!meaningfulTerm(termTokens)) return;
    checkedTerms.push(termText);
    if (findPhrase(hintTokens, termTokens) >= 0) {
      mark("direct", reason, termText);
    }
  };

  if (hintTokens.length === 0) {
    return { leaksAnswer: false, severity, reasons, matchedTerms, checkedTerms };
  }

  if (input.questionType === "short-answer") {
    checkDirectTerm(input.answer, "hint repeats the short-answer text");
  } else if (input.questionType === "multiple-choice") {
    checkDirectTerm(
      selectedChoice(input.answer, input.choices),
      "hint repeats the correct multiple-choice option"
    );
    const ordinalReason = multipleChoiceOrdinalLeak(hintTokens, input.answer);
    if (ordinalReason) mark("direct", ordinalReason);
  } else if (input.questionType === "true-false") {
    const truthReason = explicitTruthValueLeak(hintText, input.answer);
    if (truthReason) mark("direct", truthReason);
  } else if (input.questionType === "flow-diagram" || input.questionType === "drag-drop") {
    const ordered = orderedChoices(input.answer, input.choices);
    const positions = ordered.map((choice) => {
      const choiceText = text(choice);
      const choiceTokens = tokenize(choiceText);
      if (meaningfulTerm(choiceTokens)) checkedTerms.push(choiceText);
      return { choice, position: findPhrase(hintTokens, choiceTokens) };
    });
    const present = positions.filter((p) => p.position >= 0);

    if (
      positions.length > 0 &&
      present.length === positions.length &&
      positions.every((p, i) => i === 0 || p.position > positions[i - 1].position)
    ) {
      mark("direct", "hint lists all ordered answer choices in the correct order");
      matchedTerms.push(...ordered.map(text));
    } else if (
      present.length >= 2 &&
      present.every((p, i) => i === 0 || p.position > present[i - 1].position)
    ) {
      mark("partial", "hint lists multiple answer choices in answer order");
      matchedTerms.push(...present.map((p) => text(p.choice)));
    }

    if (Array.isArray(input.slots) && ordered.length > 0) {
      input.slots.forEach((slot, index) => {
        const slotPosition = findPhrase(hintTokens, tokenize(slot));
        const choicePosition = findPhrase(hintTokens, tokenize(ordered[index]));
        if (slotPosition >= 0 && choicePosition >= 0) {
          mark(
            "partial",
            `hint maps answer choice to slot "${text(slot)}"`,
            ordered[index]
          );
        }
      });
    }

    const sequenceRisk = flowSequenceRisk(hintText, ordered);
    if (sequenceRisk) {
      mark("partial", sequenceRisk.reason);
      matchedTerms.push(...sequenceRisk.terms);
    }
  }

  return {
    leaksAnswer: severity !== "none",
    severity,
    reasons: [...new Set(reasons)],
    matchedTerms: [...new Set(matchedTerms)],
    checkedTerms: [...new Set(checkedTerms)],
  };
}

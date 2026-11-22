const marker = /\[PMID [1-9]\d{0,8}\]/i;
const claimKinds = [
  ["disease-modification", /\b(progression|disease.modif|neuroprotect)/i],
  [
    "mechanistic",
    /\b(mitochondri|mechanis|cellular|oxidative|dopaminergic|animal|mice|mouse)\w*/i,
  ],
  ["observational", /\b(observational|cohort|associat|correlat)\w*/i],
  [
    "clinical-outcome",
    /\b(exercise|treatment|therapy|patients?|motor|symptoms?)\b/i,
  ],
  [
    "research-finding",
    /\b(stud(?:y|ies)|trials?|research|evidence|meta.analysis)\b/i,
  ],
];
const assertion =
  /\b(improv|reduc|increas|slow|associat|caus|support|benefit|suggest|found|show|contribut|establish|demonstrat|limited|effective|protect|impair|restor|proven|cure)\w*/i;
const sentenceBoundary = /\n\s*\n|(?<=[.!?])\s+(?!\[PMID)/i;

export function structuralGrounding(answer) {
  const counts = Object.fromEntries(claimKinds.map(([kind]) => [kind, 0]));
  let claims = 0;
  let uncitedClaims = 0;
  // Keep a marker following sentence punctuation attached to that sentence.
  const sentences = answer.split(sentenceBoundary);
  for (const sentence of sentences) {
    const kind = claimKinds.find(([, pattern]) => pattern.test(sentence))?.[0];
    if (!kind || !assertion.test(sentence)) continue;
    claims++;
    counts[kind]++;
    if (!marker.test(sentence)) uncitedClaims++;
  }
  return {
    mode: "structural-only",
    claimCount: claims,
    uncitedClaimCount: uncitedClaims,
    claimKinds: counts,
    passed: uncitedClaims === 0,
    scientificTruthAssessed: false,
  };
}

export function citationLocations(answer, startOffset = 0) {
  return [...answer.matchAll(/\[PMID ([1-9]\d{0,8})\]/gi)].map((match) => ({
    pmid: match[1],
    marker: match[0],
    startOffset: startOffset + match.index,
    endOffset: startOffset + match.index + match[0].length,
  }));
}

function spans(text, boundary) {
  const result = [];
  let start = 0;
  for (const match of text.matchAll(new RegExp(boundary.source, "gi"))) {
    result.push({ start, end: match.index });
    start = match.index + match[0].length;
  }
  result.push({ start, end: text.length });
  return result;
}

export function groundingWarnings(answer, availablePmids) {
  const paragraphs = spans(answer, /\n\s*\n/);
  return spans(answer, sentenceBoundary).flatMap(({ start, end }) => {
    const segment = answer.slice(start, end);
    const kind = claimKinds.find(([, pattern]) => pattern.test(segment))?.[0];
    if (!kind || !assertion.test(segment) || marker.test(segment)) return [];
    const startOffset = start + segment.length - segment.trimStart().length;
    const endOffset = end - (segment.length - segment.trimEnd().length);
    const paragraph = paragraphs.find(
      (span) => span.start <= startOffset && span.end >= endOffset,
    );
    const text = answer.slice(paragraph.start, paragraph.end);
    const citations = citationLocations(text, paragraph.start);
    return [
      {
        claim: answer.slice(startOffset, endOffset),
        claimKind: kind,
        startOffset,
        endOffset,
        paragraph: {
          text,
          startOffset: paragraph.start,
          endOffset: paragraph.end,
        },
        nearbyCitations: citations.map((citation) => citation.marker),
        nearbyCitationLocations: citations,
        availablePmids: [...availablePmids],
      },
    ];
  });
}

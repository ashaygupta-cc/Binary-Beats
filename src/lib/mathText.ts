// Splits dataset statement text into plain-text and LaTeX-math segments so the
// text parts can be rendered as React text nodes (never raw HTML) and only the
// math parts go through KaTeX.
//
// Two math conventions show up in the underlying datasets:
//  - Codeforces (both the locally-ingested open-r1/codeforces table and the
//    on-demand sigcp/hardtests_problems fallback preserve CF's own raw
//    markup) wraps ALL math — inline and standalone — in triple dollar signs:
//    `$$$i$$$ and $$$j$$$ such that $$$1 \le i, j \le n$$$`.
//  - AtCoder / other sources use standard single-dollar inline math (and
//    occasionally `$$...$$` for display blocks), e.g. `$ H_1 $`.
// The old parser only understood single/double `$`, so it sliced straight
// through the middle of every `$$$` run — pairing up fragments of adjacent
// triple-dollar tokens instead of whole ones. That's what produced the
// garbled, run-together text ("...andandjjsuchthatsuchthat...") users saw on
// virtually every Codeforces problem. Triple-dollar runs are now extracted as
// complete units *before* the single/double-dollar pass ever sees them.

export interface MathSegment {
  kind: "text" | "math" | "blockmath";
  value: string;
}

function pushText(out: MathSegment[], t: string) {
  if (t.length > 0) out.push({ kind: "text", value: t.replace(/\\\$/g, "$") });
}

/** Handles the `$$...$$` (block) / `$...$` (inline) convention only — assumes
 *  any `$$$` triple-dollar runs have already been extracted by the caller. */
function splitSingleOrDoubleDollar(input: string): MathSegment[] {
  const out: MathSegment[] = [];

  let i = 0;
  let textStart = 0;

  const findDelim = (from: number, delim: string): number => {
    let pos = from;
    while (pos < input.length) {
      const idx = input.indexOf(delim, pos);
      if (idx === -1) return -1;
      if (input[idx - 1] === "\\") {
        pos = idx + 1;
        continue;
      }
      return idx;
    }
    return -1;
  };

  while (i < input.length) {
    if (input[i] === "$" && input[i - 1] !== "\\") {
      const isBlock = input.startsWith("$$", i);
      const delim = isBlock ? "$$" : "$";
      const close = findDelim(i + delim.length, delim);
      if (close === -1) {
        // unterminated — treat the rest as literal text
        i += delim.length;
        continue;
      }
      pushText(out, input.slice(textStart, i));
      const body = input.slice(i + delim.length, close);
      if (body.trim().length > 0) {
        out.push({ kind: isBlock ? "blockmath" : "math", value: body });
      }
      i = close + delim.length;
      textStart = i;
      continue;
    }
    i++;
  }
  pushText(out, input.slice(textStart));

  return out;
}

/**
 * Splits on Codeforces' `$$$...$$$` inline-math convention first (as whole,
 * non-overlapping units), then runs the standard single/double-dollar parser
 * on whatever text falls outside those runs.
 */
export function splitMathSegments(input: string): MathSegment[] {
  const tripleRe = /\$\$\$([\s\S]+?)\$\$\$/g;
  const segments: MathSegment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = tripleRe.exec(input)) !== null) {
    const before = input.slice(lastIndex, m.index);
    if (before) segments.push(...splitSingleOrDoubleDollar(before));

    const body = m[1];
    if (body.trim().length > 0) segments.push({ kind: "math", value: body });

    lastIndex = tripleRe.lastIndex;
  }

  const rest = input.slice(lastIndex);
  if (rest) segments.push(...splitSingleOrDoubleDollar(rest));

  return segments;
}

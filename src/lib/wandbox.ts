// Real C++ compile + run via Wandbox (https://wandbox.org/), a free, public,
// CORS-enabled compile-and-run service. No API key, no server of our own needed.

const WANDBOX_URL = "https://wandbox.org/api/compile.json";
const COMPILER = "gcc-13.2.0";
const COMPILER_OPTIONS = "warning,gnu++17";

export const DEFAULT_CPP_CODE = "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n";

export const DEFAULT_LEETCODE_CPP_CODE = `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Write your solution method here
    
};
`;

export interface RunResult {
  success: boolean;
  compileError?: string;
  output: string;
  stderr: string;
}

interface WandboxResponse {
  status: string;
  compiler_output?: string;
  compiler_error?: string;
  program_output?: string;
  program_error?: string;
}

export async function runCode(code: string, stdin: string): Promise<RunResult> {
  let res: Response;
  try {
    res = await fetch(WANDBOX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler: COMPILER, options: COMPILER_OPTIONS, stdin }),
    });
  } catch {
    return { success: false, output: "", stderr: "Could not reach the run service — check your connection and retry." };
  }

  if (!res.ok) {
    return { success: false, output: "", stderr: `Run service returned an error (${res.status}).` };
  }

  let body: WandboxResponse;
  try {
    body = await res.json();
  } catch {
    return { success: false, output: "", stderr: "Run service returned an unreadable response." };
  }

  const compileError = body.compiler_error?.trim() ? body.compiler_error : undefined;
  return {
    success: body.status === "0" && !compileError,
    compileError,
    output: body.program_output ?? "",
    stderr: body.program_error ?? "",
  };
}

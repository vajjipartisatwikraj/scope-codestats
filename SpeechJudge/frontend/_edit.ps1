$dash = [string][char]0x2013
function Edit($path, [string[]]$pairs) {
    $t = [IO.File]::ReadAllText($path); $crlf = $t.Contains("`r`n"); if ($crlf) { $t = $t.Replace("`r`n", "`n") }
    for ($i = 0; $i -lt $pairs.Count; $i += 2) {
        if (-not $t.Contains($pairs[$i])) { Write-Output "MISSING in ${path}: $($pairs[$i])"; continue }
        $t = $t.Replace($pairs[$i], $pairs[$i + 1])
    }
    if ($crlf) { $t = $t.Replace("`n", "`r`n") }
    [IO.File]::WriteAllText($path, $t, (New-Object Text.UTF8Encoding($false)))
}
Edit 'app.js' @("const names = ['whisper', 'gopt', 'qwen', 'acoustic'];", "const names = ['whisper', 'gopt', 'gemini', 'acoustic'];")
Edit 'benchmarks.js' @(
    "  ['qwen', 'Qwen', 'real Q&A and Story evaluation prompts'],`n", "",
    "    const q = comp.qwen || {};`n", "",
    "      ['Qwen (average per evaluation)', '$dash', num(q.average_latency_seconds), '$dash', gpuCell(q), vramCell(q)],`n", "",
    "acoustic, Qwen and scoring.", "acoustic, Gemini and scoring.",
    "Qwen: real Q&A / Story prompts. '`n        + 'Each loads", "'`n        + 'Each loads")
Edit 'results.js' @("Language evaluation (Qwen ", "Language evaluation (Gemini ")
Edit 'tests\benchmarks.test.mjs' @(
    "    qwen: { average_latency_seconds: 2.4, gpu_util_avg_percent: 55, gpu_util_peak_percent: 90, vram_peak_mb: 9000 },`n", "",
    "assert.ok(r.includes('Qwen (average per evaluation)|$dash|2.40|$dash|55 % avg / 90 % peak|9,000 MB'));`n", "",
    ", 'Whisper', 'Phoneme', 'Qwen']", ", 'Whisper', 'Phoneme']")
Edit 'README.md' @(
    "# real Whisper + phoneme analysis + Qwen (Ollama) + acoustic", "# real Whisper + phoneme analysis + Gemini (needs SJ_GEMINI_API_KEY) + acoustic",
    "- Q&A and Storytelling default to async mode because CPU Qwen takes about a minute. Other types default to sync.", "- Q&A and Storytelling default to async mode (the language rating is a call to the Gemini API). Other types default to sync.",
    "model (Whisper, Phoneme, Qwen).", "model (Whisper, Phoneme).")
Edit 'server.py' @("# CPU Qwen can take a minute or more per answer", "# sections and slow language ratings can take a while")
Write-Output done

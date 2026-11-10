# Speech Judge test console

Local, no-build test UI for all five question types (Reading, Repeat, Jumbled, Q&A, Storytelling), an edge-case tab for the audio quality gate and request validation, and a run history.

## Run

Configuration: `frontend/.env` (copy from `.env.example`; git-ignored) sets `BACKEND_URL`, `FRONTEND_API_KEY` and
`FRONTEND_PORT` (default 8080). Anything missing there falls back to the backend's `speech-judge/.env`
(`SJ_HOST` / `SJ_PORT` / `SJ_SERVICE_CREDENTIALS`), so a local backend works with no frontend `.env` at all.
Real environment variables override both. To test against a deployed server, open an SSH tunnel
(`ssh -i <key.pem> -N -L 8001:127.0.0.1:8000 ubuntu@<SERVER_IP>`), set `BACKEND_URL=http://127.0.0.1:8001` and
put the server's credential in `FRONTEND_API_KEY`.

Terminal 1 (backend, from `speech-judge/`):

```powershell
.\scripts\run_api.ps1            # real Whisper + phoneme analysis + Gemini (needs SJ_GEMINI_API_KEY) + acoustic
.\scripts\run_api.ps1 -Mock      # or: everything mocked, instant
```

Terminal 2 (UI, from the repo root; standard library only, any Python 3.10+):

```powershell
python frontend\server.py
```

Open http://127.0.0.1:8080 (microphone access works on `localhost`).
## Notes

- The proxy (`server.py`) adds the service credential, so it never reaches the browser. It binds to 127.0.0.1 only and has no login: do not expose it.
- Audio (mic or uploaded file) is converted to 16 kHz mono WAV in the browser before sending.
- Q&A and Storytelling default to async mode (the language rating is a call to the Gemini API). Other types default to sync.
- Repeat plays the sentence with your browser's text-to-speech voice.
- The pronunciation panel shows expected vs heard phonemes and per-word mistakes (phoneme backend); a mocked backend is labelled MOCK automatically.
- Edit `questions.js` to change or add questions.

## Usage tab

Shows what the backend stores in its PostgreSQL usage database (`SJ_DATABASE_URL`, see the backend README): API calls
(total, errors, latency), evaluations by entry point, **Whisper evaluations and total audio transcribed**, pronunciation
checks, **Gemini calls and tokens**, four charts over time (API calls, evaluations, audio minutes, tokens), a table per
route, a table per question type, the latest API calls / evaluations, and a **Database size** panel (size of the
whole PostgreSQL database and, per table, rows, data, indexes, total, share and bytes per row). Pick the period (1 h to 90 days), tick
*Include health / ready / metrics calls* to count the monitoring routes too, or *Exclude mock traffic* to leave out runs
that used a placeholder service. It refreshes every 30 s and whenever you open the tab; `http://127.0.0.1:8080/#USAGE`
opens it directly. If monitoring is off the tab says how to turn it on. Every chart has a table version under it.

## Text-only tabs (no audio)

- **Fill blanks**: type the missing word(s). Sent as `expected_text` + `answer`; case and extra spaces are ignored, any
  other difference scores 0. Leave the box empty to test the blank case.
- **MCQ**: "Play audio" speaks the passage with the browser voice (tick *Show text* to read it). Tick the correct
  option(s); each option is sent with `is_correct` (from `questions.js`) and `selected`. Full = 100 %, some of the
  correct ones and no wrong one = 50 %, otherwise 0 %. The result lists correct / selected / wrong / missed options.
- **Email writing**: write the email in the box (word counter included). Rated by the language model; defaults to
  async mode. Shows the per-dimension scores and one-sentence feedback.
- The **Edge cases** tab has extra checks for these types (case/spacing, partial MCQ credit, validation errors).
- In `questions.js`, MCQ items need 2 to 6 options with 1 or 2 marked `correct: true`.

Frontend tests: `cd frontend/tests && npm ci && node text_types.test.mjs` (no backend needed). `render.test.mjs`
needs the proxy and a real backend running.

## Benchmarks tab

Starts the GPU benchmark scripts **on the backend server** and shows their log and the saved numbers
(`speech-judge/benchmarks/benchmark_results.json`). Buttons: one per section type (Reading, Repeat, Jumbled, Q&A,
Story Telling) plus "All 5 sections" (each sends 10 questions through `POST /api/v1/evaluate/section`), and one per
model (Whisper, Phoneme). One run at a time; "Repeat" repeats a run and reports the median.

A separate panel, **Multiple students at once**, runs the load test where 5 to 50 students (default 10) each submit a Read aloud
section of 10 answers at the same moment (it asks for confirmation first, and should only be used on the GPU server). Results:
wall time, answers per minute, how long the fastest / median / slowest student waited, queue wait, worker time, GPU use.

It needs `SJ_BENCHMARKS_ENABLED=true` in the server's `.env`; otherwise the tab says so and the buttons stay inactive.
The proxy passes the calls through like any other `/api/v1/*` request. See `speech-judge/tests/load/README.md`
for what each benchmark measures and for running the scripts by hand.

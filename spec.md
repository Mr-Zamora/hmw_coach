# 3×3 Living Space Challenge — HMW Coach
**Product Specification v1.0**

## 1. Purpose

A web tool that walks a Year 10 D&T student through a hardcoded intake (persona, genuine need, proposed solution), critiques their answers against three design tests (Swap Test, Large-Home Test, Floor-Space Conversion Test) using AI, and iterates with the student until a locked-in "How Might We" statement is produced for their folio.

Built for a 14-year-old audience: short screens, one question at a time, minimal typing, clear "why this failed" feedback, fast to redo.

## 2. Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3 + Flask |
| Templating | Jinja2 |
| Frontend | Vanilla JS (fetch calls to Flask endpoints), no framework needed |
| AI model | Google Gemini 2.5 Flash (`gemini-2.5-flash`), called server-side only (key never exposed to browser) |
| Student-side storage | Browser `localStorage` — last attempt only, editable |
| Teacher-side storage | JSON file per class on the server (`/data/records/<class>.json`), appended to on each completed session |
| Hosting | PythonAnywhere |

## 3. Assumptions (flagged — confirm or correct)

Two of your answers weren't finalised, so I've defaulted them. Tell me if either is wrong and I'll update the spec:

- **Student identification:** defaulted to **name + class typed in at the start** (no login system). This is what ties a localStorage record and a JSON entry together. If you'd rather use a teacher-issued class code instead, that's a small change.
- **Gemini API key:** defaulted to **"not yet obtained — guidance needed."** Spec below includes exactly how to get one and store it safely on PythonAnywhere as an environment variable (never hardcoded, never sent to the browser).
- **Persona scope:** fixed list only — **Gamer, Content Creator, Sports Obsessive**. No custom persona option.

## 4. User flow

### Screen 0 — Start
- Name, class (text inputs)
- "Continue where I left off" button appears automatically if a localStorage record exists for this browser
- Big single "Start" button

### Screen 1 — Persona (hardcoded, multiple choice)
- Buttons: Gamer / Content Creator / Sports Obsessive
- Follow-up: 3 short fixed prompts (who they are / what they do / what they need), each a short-answer text box, one at a time

### Screen 2 — Genuine need (hardcoded short-answer, AI-critiqued)
- One text box: "Describe one specific moment your session gets interrupted by another zone."
- On submit → Gemini call runs the **Large-Home Test** and **Floor-Space Conversion Test** against the answer
- AI returns: Pass/Needs work + one short plain-language reason (max ~40 words, written for a 14-year-old, no jargon)
- If "Needs work," student edits and resubmits (max 3 attempts shown as a small counter, then a "keep going" hint offers a worked example prompt — not an auto-answer)

### Screen 3 — Proposed solution (hardcoded multiple choice)
- Buttons: Product / System / Environment
- Short-answer text box: "Describe it in 1–2 sentences"
- On submit → Gemini runs **Swap Test** + **Large-Home Test** + **Floor-Space Conversion Test** against the full picture so far
- Same Pass/Needs work + short reason pattern as Screen 2

### Screen 4 — HMW generation
- Gemini generates 2–3 HMW options using the locked template structure from the coaching prompt (persona, transition, competing zones, why-it-passes-each-test)
- Displayed as swipeable/stacked cards (short, scannable — no walls of text)
- Buttons under each: "This one" / "None of these — try again"

### Screen 5 — Lock in
- Final HMW statement
- One-line Swap Test justification
- One-line spatial justification
- Floor-space conversion arrow format: `First use → activity → next use`
- "Copy to clipboard" button (client-side, copies full HMW statement + justifications as formatted text)
- Save triggers: (1) write/update localStorage record, (2) POST to Flask to append to the class JSON file

## 5. Data model

### localStorage (client, per student browser)
```json
{
  "name": "string",
  "class": "string",
  "persona": "string",
  "personaAnswers": ["string","string","string"],
  "genuineNeed": "string",
  "solutionType": "Product|System|Environment",
  "solutionDescription": "string",
  "testResults": [ { "screen": "genuineNeed|solution", "pass": true, "feedback": "string" } ],
  "hmwOptions": ["string","string","string"],
  "finalHMW": "string",
  "lastUpdated": "ISO timestamp"
}
```
- Only ever holds the **most recent** attempt, overwritten each save — matches your "edit last one" requirement.

### Server JSON (teacher view, per class)
`/data/records/<class>.json` — an array, one entry appended per completed (locked-in) session:
```json
[
  {
    "name": "string",
    "timestamp": "ISO timestamp",
    "persona": "string",
    "finalHMW": "string",
    "swapJustification": "string",
    "spatialJustification": "string",
    "floorSpaceConversion": "string"
  }
]
```
- A simple teacher-facing page (`/teacher/<class>`, no auth by default — add a basic password if this will be reachable outside your school network) lists all entries in a plain table, newest first.

## 6. Flask routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Screen 0 |
| `/api/check-answer` | POST | Sends current answer + context to Gemini, returns pass/fail + short feedback (used on Screens 2 & 3) |
| `/api/generate-hmw` | POST | Sends full intake to Gemini, returns 2–3 HMW option objects |
| `/api/save-record` | POST | Appends final record to the class JSON file |
| `/teacher/<class_name>` | GET | Renders table of saved records for that class |

All Gemini calls happen **only** inside these Flask routes — the API key lives in an environment variable on PythonAnywhere and is never sent to the browser.

## 7. AI prompting approach

Each `/api/check-answer` call sends Gemini a system-style instruction reusing the exact Test A/B/C logic from the original coaching prompt, plus the student's current answer and prior context, with an explicit instruction to:
- Respond in strict JSON only: `{"pass": true|false, "feedback": "..."}`
- Keep feedback under ~40 words, plain language, no jargon, encouraging but honest (matches the original prompt's tone)

`/api/generate-hmw` reuses the HMW template and "why it passes each test" structure from the original prompt, again requesting strict JSON so the frontend can render cards without parsing free text.

## 8. UX notes for a 14-year-old, impatient user

- One question per screen, large tap targets, no scrolling walls of text
- Progress dots at the top (Screen 1 of 5) so they know how much is left
- Feedback is short and direct — "why it failed" in one sentence, not a paragraph
- "Keep going" hint after repeated fails, rather than blocking progress entirely
- Autosave to localStorage after every screen, so closing the tab mid-way doesn't lose work

## 9. Setup steps (PythonAnywhere + Gemini key)

1. Get a Gemini API key from Google AI Studio (free tier is fine for classroom volume).
2. On PythonAnywhere: Web tab → your app → Environment variables → add `GEMINI_API_KEY`.
3. In Flask, read it with `os environ.get("GEMINI_API_KEY")` — never hardcode it in the repo.
4. Reload the web app after adding the variable.

## 10. Resolved decisions

- **AI model:** `gemini-3.5-flash-lite`, chosen for speed. (`gemini-2.5-flash` returned a 404 "no longer available to new users" on this API key; `gemma-4-26b-a4b-it` was tested but rejected — it emits chain-of-thought reasoning before the JSON answer even in JSON mode, which breaks strict parsing. `gemini-3.5-flash-lite` returns clean, directly-parseable JSON.)
- **Test naming:** The three display names (Swap Test, Large-Home Test, Floor-Space Conversion Test) map to two underlying AI tests — Test A (Swap) and Test B (Spatial). "Large-Home Test" and "Floor-Space Conversion Test" are the two angles of Test B shown to students; the Floor-Space Conversion arrow format (`First use → activity → next use`) is an output format, not a separate AI call.
- **Retry behaviour:** After 3 failed attempts on either Screen 2 or Screen 3, show a worked-example hint and allow the student to proceed regardless. Behaviour is identical on both screens.
- **Teacher page auth:** None for now. Add later if needed.
- **Scale:** 1 class, ~30 students. Flat JSON files per class are sufficient.

## 11. Original coaching prompt (source of test logic & HMW template)

```
You are a design-thinking coach helping a Year 10 Design and Technology student develop an original concept for the "3×3 Living Space Challenge" — designing for one person living in a 3 × 3 m (9 m²) space with four zones that must all coexist: sleeping, living, cooking, bathing.

Your job in this conversation is to run a short, structured intake, then generate "How Might We" (HMW) options and refine them with the student until they're happy.

STEP 1 — INTAKE (ask these three questions one at a time, wait for an answer before moving to the next):
1. Who is your persona? (e.g. The Gamer, The Content Creator, The Sports Obsessive, or a persona of their own — ask them to briefly say who this person is and what they need.)
2. In a few sentences, what do you think this persona's GENUINE need or problem actually is — not just what gear they own, but the specific moment or situation where things get hard for them?
3. What solution are you leaning toward? Describe it as a Product (a single object), a System (connected parts/steps), or an Environment (a full room redesign) — whatever level of detail you have so far is fine.

STEP 2 — TWO TESTS (apply both before generating anything):

Test A — The Swap Test:
"Could this exact design hold or do the same job for a totally different persona or item, with zero changes?"
- If yes, explain why (e.g. "this is a hook/shelf/fold-out desk with a name attached — it would work identically for a totally different person").

Test B — The Spatial Test (3×3 constraint):
"Would this exact problem occur unchanged if this persona lived in a normal-sized home or a private studio, with no other zones nearby?"
- If yes, the idea fails — the 9 m² constraint isn't doing any real work in the problem, it's just the setting.
- If the honest answer is "yes, this would still be a problem in a big house," push the student to find where their persona's need actually collides with the room's other functions. Ask directly: Which of the other three zones (sleeping / living / cooking / bathing) does this need compete with, overlap with, or have to transition around? What breaks, gets exposed, gets damaged, or gets in the way specifically because those zones are close together or share the same floor space?

Use both tests to push the student toward a moment that is (a) specific to their persona, and (b) only a problem because of the 9 m² multi-zone squeeze.

STEP 3 — GENERATE HMW OPTIONS:
Using the formula "How might we solve [the hard part of the moment], for [persona], when [the specific moment] — in a 9 m² space shared with [the competing zone(s)]?" — generate 2–3 distinct HMW statements grounded in the student's own answers. Each one must:
- Target a genuinely specific physical or emotional moment, not a generic activity
- Make the 3×3 m constraint essential — explicitly name which zone(s) the need is competing, overlapping, or transitioning with (e.g. gear exposed to cooking steam, storage colliding with where the bed folds out, noise/light bleeding into the sleeping zone, floor space needed by two zones at once)
- Be different enough from each other that they'd lead to different design solutions
- Pass BOTH the Swap Test and the Spatial Test

For each option, include a one-line note showing your working: "Fails without the 3×3 constraint because: [reason]" and "Fails the Swap Test if changed because: [reason]."

Present them clearly labelled (Option 1, Option 2, Option 3).

STEP 4 — ITERATE:
Ask the student which one resonates, or whether none do. If they want changes, ask what feels off (too broad, wrong moment, doesn't sound like their persona, doesn't actually need the small space, etc.) and regenerate. Keep refining — narrower, more specific, more tied to the physical reality of a shared 9 m² space — until the student confirms they're satisfied with one HMW statement.

STEP 5 — LOCK IT IN:
Once they confirm, output the final HMW statement clearly formatted for their folio, followed by:
- A one-line Swap Test justification
- A one-line Spatial Test justification (naming the specific zone conflict)
both ready for the student to write underneath it in their own document.

Tone: Direct, encouraging, but honestly critical — don't rubber-stamp generic ideas just because the student likes them, and don't let an idea through just because it's persona-specific if it would work identically in a normal-sized home. Your job is to stop them submitting a "generic holder wearing a costume" AND a "generic holder that happens to sit in a small room."

Begin now with Step 1, Question 1.
```

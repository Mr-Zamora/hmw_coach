import os
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')

# Configure the Gemini API key
# In a production environment like PythonAnywhere, set this as an environment variable directly
# (Web tab -> your app -> Environment variables -> GEMINI_API_KEY). Never hardcode the key.
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in your .env file or environment.")
genai.configure(api_key=api_key)

MODEL_NAME = "gemini-3.5-flash-lite"

DATA_DIR = Path(__file__).parent / "data" / "records"
DATA_DIR.mkdir(parents=True, exist_ok=True)


# --- GEMINI HELPERS ---

SWAP_TEST_RULES = """Test A -- The Swap Test:
"Could this exact design hold or do the same job for a totally different persona or item, with zero changes?"
- If yes, it FAILS: it's a generic object with a persona's name attached.
- A pass must be something that would clearly not work, or would need real changes, for a different persona."""

SPATIAL_TEST_RULES = """Test B -- The Spatial Test (3x3m / 9 sqm constraint):
"Would this exact problem occur unchanged if this persona lived in a normal-sized home or a private studio, with no other zones nearby?"
- If yes, it FAILS: the 9 sqm constraint isn't doing any real work, it's just the setting.
- A PASS must name which of the other three zones (sleeping / living / cooking / bathing) the need competes with, overlaps with, or transitions around, and what breaks, gets exposed, or gets in the way specifically because those zones are close together."""


def call_gemini_json(prompt: str) -> dict:
    """Calls Gemini and parses a strict JSON response."""
    model = genai.GenerativeModel(MODEL_NAME)
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.6,
        ),
    )
    text = (response.text or "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def build_check_answer_prompt(screen, persona, persona_answers, genuine_need, solution_type, current_answer):
    persona_details = ' | '.join([a for a in (persona_answers or []) if a]) or 'N/A'
    context = f"Persona: {persona}\nPersona details: {persona_details}"

    if screen == 'need':
        return f"""You are a design-thinking coach grading a Year 10 Design & Technology student's answer for the "3x3 Living Space Challenge" (designing for one person living in a 3x3m / 9 sqm space with four zones that must coexist: sleeping, living, cooking, bathing).

{context}

The student was asked: "Describe one specific moment your session gets interrupted by another zone."
Their answer: "{current_answer}"

{SPATIAL_TEST_RULES}

Grade this answer against the Spatial Test only. Respond in strict JSON only, no markdown, no extra text:
{{"pass": true or false, "feedback": "one short sentence, max 40 words, plain language for a 14-year-old, no jargon, encouraging but honest"}}"""

    # screen == 'solution'
    return f"""You are a design-thinking coach grading a Year 10 Design & Technology student's answer for the "3x3 Living Space Challenge" (designing for one person living in a 3x3m / 9 sqm space with four zones that must coexist: sleeping, living, cooking, bathing).

{context}
Genuine need / moment identified earlier: "{genuine_need}"

The student proposed a solution.
Solution type: {solution_type}
Solution description: "{current_answer}"

{SWAP_TEST_RULES}

{SPATIAL_TEST_RULES}

Grade this solution against BOTH tests -- it must pass both to pass overall. Respond in strict JSON only, no markdown, no extra text:
{{"pass": true or false, "feedback": "one short sentence, max 40 words, plain language for a 14-year-old, no jargon, encouraging but honest"}}"""


def build_generate_hmw_prompt(persona, persona_answers, genuine_need, solution_type, solution_description):
    persona_details = ' | '.join([a for a in (persona_answers or []) if a]) or 'N/A'
    context = f"""Persona: {persona}
Persona details: {persona_details}
Genuine need / moment: {genuine_need}
Proposed solution type: {solution_type}
Proposed solution description: {solution_description}"""

    return f"""You are a design-thinking coach helping a Year 10 D&T student for the "3x3 Living Space Challenge" (designing for one person living in a 3x3m / 9 sqm space with four zones that must coexist: sleeping, living, cooking, bathing).

{context}

{SWAP_TEST_RULES}

{SPATIAL_TEST_RULES}

Using the formula "How might we solve [the hard part of the moment], for [persona], when [the specific moment] -- in a 9 sqm space shared with [the competing zone(s)]?", generate 2-3 distinct HMW statements grounded in the student's own answers above. Each must:
- Target a specific physical or emotional moment, not a generic activity
- Explicitly name which zone(s) the need competes with, overlaps with, or transitions with
- Be different enough from each other to lead to different design solutions
- Pass BOTH the Swap Test and the Spatial Test

For each option also provide:
- A one-line Swap Test justification (why it would NOT work identically for a different persona)
- A one-line Spatial Test justification (naming the specific zone conflict)
- A floor-space conversion sequence of exactly 3 short labels (2-4 words each) showing how the same floor space is used before, during, and after the moment, e.g. ["Gaming session", "Pack-down", "Sleep zone active"]
- A "designDirections" object with three short 1-sentence suggestions for this HMW, one each as: product (a physical object or piece of furniture), system (a routine, process or connected set of behaviours), and environment (a spatial or sensory change to the room).

Tone: direct, encouraging, honestly critical -- written for a 14-year-old, no jargon.

Respond in strict JSON only, no markdown, no extra text, using this exact shape:
{{
  "options": [
    {{
      "hmw": "How might we ...",
      "swapJustification": "...",
      "spatialJustification": "...",
      "floorSpaceConversion": ["step one", "step two", "step three"],
      "designDirections": {{
        "product": "...",
        "system": "...",
        "environment": "..."
      }}
    }}
  ]
}}"""


# --- RENDER ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/teacher/<class_name>')
def teacher_view(class_name):
    safe_class = re.sub(r'[^A-Za-z0-9_-]', '_', class_name)
    file_path = DATA_DIR / f"{safe_class}.json"
    records = []
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            records = json.load(f)
    records.sort(key=lambda r: r.get('timestamp', ''), reverse=True)
    return render_template('teacher.html', class_name=class_name, records=records)


# --- API ROUTES ---

@app.route('/api/check-answer', methods=['POST'])
def check_answer():
    data = request.get_json(force=True) or {}
    screen = data.get('screen')
    persona = data.get('persona', '')
    persona_answers = data.get('personaAnswers', [])
    genuine_need = data.get('genuineNeed', '')
    solution_type = data.get('solutionType', '')
    current_answer = data.get('answer', '')

    prompt = build_check_answer_prompt(screen, persona, persona_answers, genuine_need, solution_type, current_answer)
    try:
        result = call_gemini_json(prompt)
        return jsonify({"pass": bool(result.get("pass")), "feedback": result.get("feedback", "")})
    except Exception as e:
        app.logger.error(f"Gemini check-answer error: {e}")
        return jsonify({"pass": False, "feedback": "Something went wrong checking your answer. Please try again."}), 502


@app.route('/api/generate-hmw', methods=['POST'])
def generate_hmw():
    data = request.get_json(force=True) or {}
    persona = data.get('persona', '')
    persona_answers = data.get('personaAnswers', [])
    genuine_need = data.get('genuineNeed', '')
    solution_type = data.get('solutionType', '')
    solution_description = data.get('solutionDescription', '')

    prompt = build_generate_hmw_prompt(persona, persona_answers, genuine_need, solution_type, solution_description)
    try:
        result = call_gemini_json(prompt)
        if 'options' not in result:
            raise ValueError("Missing 'options' in Gemini response")
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Gemini generate-hmw error: {e}")
        return jsonify({"options": [], "error": "Could not generate HMW options. Please try again."}), 502


@app.route('/api/save-record', methods=['POST'])
def save_record():
    data = request.get_json(force=True) or {}
    class_name = (data.get('class') or 'unknown').strip() or 'unknown'
    safe_class = re.sub(r'[^A-Za-z0-9_-]', '_', class_name)
    file_path = DATA_DIR / f"{safe_class}.json"

    records = []
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            records = json.load(f)

    record = {
        "name": data.get('name', ''),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "persona": data.get('persona', ''),
        "finalHMW": data.get('finalHMW', ''),
        "swapJustification": data.get('swapJustification', ''),
        "spatialJustification": data.get('spatialJustification', ''),
        "floorSpaceConversion": data.get('floorSpaceConversion', ''),
        "designProduct": data.get('designProduct', ''),
        "designSystem": data.get('designSystem', ''),
        "designEnvironment": data.get('designEnvironment', ''),
        "allHMWOptions": data.get('allHMWOptions', []),
    }
    records.append(record)

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)

    return jsonify({"success": True})


if __name__ == '__main__':
    app.run(debug=True, port=5001)

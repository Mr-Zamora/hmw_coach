# 3×3 HMW Coach

A Year 10 Design & Technology coaching tool for the **3×3 Living Space Challenge**.
Students describe a persona, identify a genuine need, propose a solution, and get AI-generated *How Might We* (HMW) statements that pass the Swap Test and Spatial Test.

## What it does

- Walks students through a 5-step design-thinking flow
- Uses Google Gemini to check answers against the Swap and Spatial tests
- Generates 2–3 HMW options, each with justifications and floor-space conversions
- Suggests **product**, **system**, and **environment** design directions for each HMW
- Saves student records for the teacher view
- Lets teachers review and export submissions by class

## Tech stack

- **Backend**: Flask (Python)
- **Frontend**: Jinja2 templates + vanilla JavaScript + localStorage for session state
- **AI**: Google Gemini (`gemini-3.5-flash-lite`)
- **Storage**: JSON files in `data/records/<class>.json`

## Quick start

1. Clone the repo and enter the project folder
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Create your environment file:

   ```bash
   cp .env.example .env
   ```

4. Add your `GEMINI_API_KEY` to `.env`:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

5. Run the Flask app:

   ```bash
   python app.py
   ```

6. Open `http://localhost:5001/` in a browser.

## Teacher view

After students submit, you can view their records at:

```
http://localhost:5001/teacher/<class_name>
```

For example:

```
http://localhost:5001/teacher/10DT
```

The teacher view shows all HMW options, the selected HMW, and the design directions.

## Project structure

```
how_might_we/
├── app.py                 # Flask app and Gemini prompts
├── requirements.txt       # Python dependencies
├── .env.example           # Example environment variables
├── .gitignore             # Excludes .env, data, and Python cache
├── README.md              # This file
├── spec.md                # Product specification
├── data/                  # Saved student records (ignored by Git)
├── static/
│   ├── css/styles.css     # App styles
│   ├── js/app.js          # Client-side state machine
│   └── images/            # Static images
└── templates/
    ├── index.html         # Single-page student app
    └── teacher.html       # Teacher view
```

## Environment variables

- `GEMINI_API_KEY` — your Google Gemini API key

## Notes

- `.env` and the `data/` folder are ignored by Git to keep secrets and student records out of version control.
- `templates/screen*.html` files are earlier flat-prototype screens; the live app uses `templates/index.html`.

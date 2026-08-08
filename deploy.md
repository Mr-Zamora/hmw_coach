# Deploy on PythonAnywhere (from scratch)

This guide covers deploying the `hmw_coach` Flask app from a fresh PythonAnywhere account.

## 1. Sign in to PythonAnywhere

- Go to <https://www.pythonanywhere.com/>
- Log in to the `hmwcoach` account

## 2. Open a Bash console

From the PythonAnywhere dashboard, go to **Consoles > Bash**.

## 3. Clone the repo

```bash
cd ~
git clone https://github.com/Mr-Zamora/hmw_coach.git
cd hmw_coach
```

## 4. Create a virtualenv and install dependencies

```bash
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 5. Set the API key

Create a `.env` file (or set it in the next step).

```bash
cp .env.example .env
```

Then edit `.env` and replace `your_api_key_here` with your real `GEMINI_API_KEY`:

```
GEMINI_API_KEY=your_real_key_here
```

## 6. Create the web app

Go to the **Web** tab and click **Add a new web app**.

- Choose **Manual configuration**
- Choose **Python 3.10**

## 7. Configure the web app

In the Web tab, set these fields:

- **Source code**: `/home/hmwcoach/hmw_coach`
- **Working directory**: `/home/hmwcoach/hmw_coach`
- **Virtualenv path**: `/home/hmwcoach/hmw_coach/venv`

## 8. Edit the WSGI file

Open the WSGI file (shown on the Web tab) and replace it with:

```python
import sys
path = '/home/hmwcoach/hmw_coach'
if path not in sys.path:
    sys.path.append(path)

from app import app as application
```

## 9. Add static files mapping

Under **Static files**, add:

- **URL**: `/static/`
- **Path**: `/home/hmwcoach/hmw_coach/static`

## 10. Set the environment variable

Go to **Web > (your app) > Environment variables** and add:

```
GEMINI_API_KEY=your_real_key_here
```

If you already have `.env`, this step is optional, but setting it in the Web tab is more reliable on PythonAnywhere.

## 11. Reload the app

Click the green **Reload** button.

## 12. Test the site

Open:

- Student app: `https://hmwcoach.pythonanywhere.com/`
- Teacher view: `https://hmwcoach.pythonanywhere.com/teacher/10dt`

---

# Updating the live site later

After making local changes and pushing to GitHub:

## 1. Push from local

```bash
git add -A
git commit -m "Your change message"
git push origin main
```

## 2. Pull on PythonAnywhere

Open a Bash console on PythonAnywhere and run:

```bash
cd ~/hmw_coach
git pull origin main
```

## 3. Reload the web app

Go to the **Web** tab and click **Reload**.

## 4. Check it

Visit the same URLs above.

---

## If something breaks

- Check **Web > Error log** for Python/Flask errors.
- Make sure `GEMINI_API_KEY` is set in the Web app environment variables or in `.env`.
- Confirm the static files mapping still points to `/home/hmwcoach/hmw_coach/static`.

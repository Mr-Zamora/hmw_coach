# Deploy / update on PythonAnywhere

Quick checklist to push the latest version of `hmw_coach` live.

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

Go to the **Web** tab in PythonAnywhere and click **Reload**.

## 4. Check it

Visit:

- Student app: `https://hmwcoach.pythonanywhere.com/`
- Teacher view: `https://hmwcoach.pythonanywhere.com/teacher/10dt`

---

## If something breaks

- Check the **Web > Error log** for Python/Flask errors.
- Make sure `GEMINI_API_KEY` is still set under **Web > Environment variables**.
- Confirm the static files mapping still points to `/home/hmwcoach/hmw_coach/static`.

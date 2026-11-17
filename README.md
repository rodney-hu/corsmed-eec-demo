# The MRI Educator's Blueprint: a spec demo for Corsmed

This is a concept landing page plus a 5-day email course for MRI educators, built as an example of buyer education for Corsmed. It's live at [corsmed-demo.vercel.app](https://corsmed-demo.vercel.app/).

Demo by Rodney Hu. Not affiliated with or endorsed by Corsmed.

## What's here
- `site/index.html`, `site/thanks.html` and `site/styles.css`: the landing page and the thank-you page.
- `site/emails/day-0.md` to `day-5.md`: the email course.
- `site/api/` and `site/drip.config.json`: a small serverless sign-up that schedules the course emails through Resend. It only runs when a `RESEND_API_KEY` is set on the host. No keys are in this repo.
- `screenshots/`: desktop and mobile captures of the page.

The page is set to noindex.

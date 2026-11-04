# theezraanya.com

Multipage portfolio for Ezra Anya. Plain HTML, CSS and JavaScript with no build step, so it runs on GitHub Pages as it is.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `about.html` | About |
| `work-with-ezra.html` | Offers, Speaking (`#speaking`), Press Kit (`#press-kit`), FAQ |
| `strategy-session.html` | Strategy Session: 1:1, group and consulting, with booking form |
| `thrivetribe.html` | TheThriveTribe mentorship and registration |
| `reflections.html` | Reflections W/ TEA, Edition 04: Relationships |
| `writing.html` | Substack essays, YouTube and Spotify, books |
| `contact.html` | Contact form and details |
| `404.html` | Not-found page |

Shared files live in `css/style.css` and `js/main.js`. Every page loads them, so a change there updates the whole site.

## Deploy on GitHub Pages

1. Upload everything in this folder to the root of your repository, including the hidden `.github` folder and the `.nojekyll` file.
2. In the repository, go to **Settings → Pages**. Set the source to **Deploy from a branch** and pick `main` and `/ (root)`.
3. The `CNAME` file holds `theezraanya.com`. Keep it if the domain already points to GitHub Pages. If you deploy to `username.github.io` instead, delete it.

## Forms (one-time activation)

All forms send to **message.theezraanya@gmail.com** through FormSubmit. That service works on GitHub Pages and needs no account or server.

- The **first** time anyone submits a form, FormSubmit emails an activation link to that inbox. Click it once and every form on the site starts delivering.
- Every submission arrives as a tidy table email with the page name and enquiry type in the subject line.
- If FormSubmit is ever down, the form shows a link that opens the visitor's email app with the message already filled in.

To change the receiving address, edit `EMAIL` near the top of `js/main.js`.

## Substack posts

The Writing page and the home page show the latest essays from `theezraanya.substack.com`. The site gets them in this order:

1. `data/posts.json`. A GitHub Action (`.github/workflows/substack.yml`) refreshes this file every six hours. To run it straight away, open the **Actions** tab, choose **Sync Substack posts** and click **Run workflow**. If the Action can't push, go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**.
2. If that file is empty, the browser asks rss2json.com for the feed directly.
3. If both fail, three featured essays show, each linking to Substack.

## Updating Reflections each month

In `reflections.html`:

- Change the edition number, theme, subtitle, description and topic pills in the **THIS MONTH** section and the poster.
- Update the date in every `data-countdown="2026-11-21T19:00:00+01:00"` attribute. The same attribute also appears in the Reflections strip on `index.html`.
- In **The year of themes**, move the `theme--now` class to the new month, mark the previous month `theme--done`, and set `theme--next` on the one after.
- Update the hidden `enquiry` field in the registration form so emails show the right edition.

## Fonts

- Headlines use **Archivo** at its widest setting (`wdth 125`). That gives the wide block grotesk look, because Geist has no wide cut.
- Labels, navigation and buttons use **Geist**.
- Body text uses **Didot**. Macs show the system Didot, and every other device loads GFS Didot from Google Fonts.
- The italic accent words inside headlines use Didot italic on Macs and Playfair Display italic everywhere else, because GFS Didot has no italic.

All three load from Google Fonts. To set headlines in Geist, change `--display` at the top of `css/style.css`.

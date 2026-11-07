# theezraanya.com

Multipage portfolio for Ezra Anya. Plain HTML, CSS and JavaScript with no build step, so it runs on GitHub Pages as it is.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `about.html` | About |
| `work-with-ezra.html` | Overview: Clarity Conversation, Growth Advisory and the specialist services |
| `advisory.html` | Growth Advisory: Strategy, Structure and Synergy, plus the five practice areas |
| `clarity.html` | The Clarity Conversation: discovery form first, then the Calendly booking calendar |
| `strategy.html` | Strategy (₦20,000) |
| `structure.html` | Structure (₦100,000 a month or ₦250,000 for three months) |
| `synergy.html` | Synergy (from ₦2,000,000, minimum six months) |
| `ai-advisory.html` | AI Ethics and Workflow |
| `speaking.html` | Speaking and Training, with the event enquiry form |
| `press-kit.html` | Press Kit: bios, facts, real photos and logos |
| `thrivetribe.html` | TheThriveTribe mentorship and registration |
| `reflections.html` | Reflections W/ TEA |
| `writing.html` | Substack essays, YouTube and Spotify, books |
| `essay.html` | Reads a full Substack essay on the site |
| `reader.html` | Reads a guide PDF page by page in the browser |
| `library.html` | Full list of guides (the same guides also show on the Writing page under Guides) |
| `contact.html` | Contact form and details |
| `strategy-session.html`, `retainer.html`, `brand-projects.html` | Retired pages that forward visitors to Strategy and Synergy |
| `404.html` | Not-found page |

Shared files live in `css/style.css` and `js/main.js`. Every page loads them, so a change there updates the whole site.

## Booking and the discovery form

Every "Book a session" button leads to `clarity.html`. Visitors answer the 14-question discovery form in six short steps. Answers save on their device as they type, so a closed tab loses nothing. On submit:

1. The answers go to message.theezraanya@gmail.com as a numbered table, with the visitor's name in the subject line and their email set as the reply-to address.
2. The Calendly calendar (`https://calendly.com/ezraanya/talk-w-tea`) opens on the same page with the visitor's name and email already filled in.

If the email step ever fails, the visitor still gets the calendar plus a link that opens their email app with every answer filled in, so nothing is lost.

To change the Calendly link, edit `CALENDLY` in `build` or search the HTML files for `calendly.com/ezraanya/talk-w-tea`. Rename the Calendly event to "The Clarity Conversation" and set it to 30 to 45 minutes so the booking page matches the site.

## Forms (one-time activation, please do this first)

The contact, speaking, ThriveTribe and Reflections forms send to **message.theezraanya@gmail.com** through FormSubmit. It works on GitHub Pages with no account.

FormSubmit holds every form until the inbox owner confirms it once:

1. Open the live site and send a test message through the contact form.
2. In the message.theezraanya@gmail.com inbox, look for an email from FormSubmit titled "Action Required: Activate FormSubmit". Check Spam and Promotions too.
3. Click **Activate Form**. From then on, every form on the site delivers to that inbox.

Until that click, visitors see a note that the form is waiting for activation and a link that opens their email app with the message already filled in.

To change the receiving address, edit `EMAIL` near the top of `js/main.js`, then activate again from the new inbox.

## Substack posts

The Writing page and the home page show the latest essays from `theezraanya.substack.com`. The site tries these in order:

1. `data/posts.json`, refreshed every six hours by the GitHub Action in `.github/workflows/substack.yml`.
2. rss2json.com, straight from the visitor's browser.
3. Two public feed relays (allorigins and corsproxy), also from the browser.
4. Three featured essays that link to Substack, if everything else fails.

The Action tries Substack's feed, then Substack's archive API, then rss2json. Substack sometimes blocks GitHub's servers, so the Action no longer fails when that happens. It logs which source it tried and keeps the last good list.

To run it now, open the **Actions** tab, choose **Sync Substack posts**, then **Run workflow**. If the log says it could not push, go to **Settings → Actions → General → Workflow permissions**, choose **Read and write permissions** and save.

## Reading essays on the site

Essay cards on the home and Writing pages open `essay.html`, which shows the full essay in a clean reading layout with a subscribe box at the end. The text comes from the same Substack sources as the cards, and the GitHub Action stores the full text of each post in `data/posts.json`. Substack widgets and scripts are stripped before display. If a post has only a teaser (a paid post, for example), the page shows the teaser and a button to finish reading on Substack.

## AI image note

The footer on every page says some photographs are AI-assisted renderings, and that press kit photos are unaltered. When real event photos replace the AI ones, delete the note from `build` or from each page's footer, and keep the press kit limited to real photographs.

## Guides: adding a PDF

Guides show on the Writing page (`writing.html#guides`) and on `library.html`. Carousel PDFs exported from design tools are often huge, so compress them before uploading. GitHub refuses files over 100MB, and visitors on mobile data will not wait for them. The three current guides were reduced from about 99MB to 1 to 2MB each with no visible loss.

## Library: adding a playbook

1. Put the PDF in the `library/` folder, for example `library/ai-policy-playbook.pdf`.
2. Optional: add a cover image, for example `library/ai-policy-playbook.jpg`, at 3:4.
3. Add an entry to `data/library.json`:

```json
{
  "items": [
    {
      "slug": "ai-policy-playbook",
      "title": "The AI Policy Playbook",
      "type": "Playbook",
      "summary": "A step-by-step guide to writing an AI responsible-use policy your team will follow.",
      "file": "library/ai-policy-playbook.pdf",
      "cover": "library/ai-policy-playbook.jpg",
      "pages": 18
    }
  ]
}
```

The guide then appears on the Writing page and the library page, with **Read online** and **Download PDF** buttons. Read online opens `reader.html`, which shows every page in the browser on phones and laptops.

## Updating Reflections each month

In `reflections.html`:

- Change the edition number, theme, subtitle, description and topic pills in the **THIS MONTH** section and the poster.
- Update the date in every `data-countdown="2026-11-21T19:00:00+01:00"` attribute. The same attribute also appears in the Reflections strip on `index.html`.
- In **The year of themes**, move the `theme--now` class to the new month, mark the previous month `theme--done`, and set `theme--next` on the one after.
- Update the hidden `enquiry` field in the registration form so emails show the right edition.

## Fonts

- Headlines use **Archivo** at its widest setting (`wdth 125`). That gives the wide block grotesk look, because Geist has no wide cut.
- Labels, navigation and buttons use **Geist**.
- Body text uses **Lora**.
- The italic accent words inside headlines use **Times New Roman** italic. Phones and computers without Times New Roman get **Tinos** from Google Fonts, which has the same letter widths.

All three load from Google Fonts. To set headlines in Geist, change `--display` at the top of `css/style.css`.

## Forms into a Google Sheet (recommended)

All forms (Clarity, contact, speaking, ThriveTribe, Reflections) go to a Google Sheet once `js/config.js` has a web app URL. Until then they fall back to FormSubmit.

1. Create a new Google Sheet called "Website responses".
2. In the Sheet: Extensions → Apps Script. Delete what is there and paste everything from `google-apps-script/Code.gs`. Save.
3. Deploy → New deployment → gear icon → Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy, then approve the Google permission screens (Advanced → Go to project if Google warns you).
4. Copy the Web app URL. It ends in `/exec`.
5. Open `js/config.js` and paste it between the quotes of `EA_SHEET_ENDPOINT`. Commit.

Each form gets its own tab. New questions add their own columns. You also get an email for every submission, and replying to that email replies to the person.

If you edit Code.gs later: Deploy → Manage deployments → pencil → Version: New version. The URL stays the same.

## Settings in js/config.js

- `EA_SHEET_ENDPOINT` the Apps Script URL above.
- `EA_CLARITY_ID` Microsoft Clarity project (za12929qoy). Clarity only records after a visitor taps Accept on the cookie notice. Dashboard: clarity.microsoft.com.
- `EA_SUBSTACKS` every Substack publication to pull into Writing. Add one line per publication, and add the same entry to `PUBLICATIONS` in `scripts/fetch-substack.mjs`.

## Privacy

`privacy.html` explains what the forms and Clarity collect. Read it and change anything that does not match how you actually handle data, especially the retention period.

## Writing labels

Posts in the main Substack show as **Letters**. Posts in the Authentic Intelligence section (theezraanya.substack.com/s/authenticintelligence) show as **Publications**. To rename either, edit `EA_TAG_LABELS` in `js/config.js`.

## Workbooks and playbooks (flipbook)

`reader.html` turns each PDF into a flipbook. PDF.js draws the pages and StPageFlip (MIT licence, saved in `js/vendor/`) turns them. Two-page spreads show on wide screens and single pages on phones. The type shown on each card (Workbook or Playbook) is the `type` field in `data/library.json`.

## Automatic replies and email templates

`google-apps-script/Code.gs` now also:
- sends each person a branded confirmation email when they submit a form (edit the wording in `AUTO_REPLIES` near the top),
- adds an **Ezra** menu to the Sheet. Use "Set up the Templates tab" once, write an email in a new row of the Templates tab, open a tab such as Reflections, then choose "Email everyone on this tab". An "Emails sent" column stops anyone getting the same email twice.

Emails come from the Google account that owns the script, shown with the name "Ezra Anya", and replies go to message.theezraanya@gmail.com. To send from a different address, add it in Gmail under Settings > Accounts > Send mail as, then fill in `FROM_ALIAS`.

Every change to Code.gs needs Deploy > Manage deployments > pencil > Version: New version.

## Umami

The Umami tag sits in the `<head>` of every page (set in `build/build.py`). It also records a "Form sent" event with the form name and nothing else. Dashboard: cloud.umami.is.

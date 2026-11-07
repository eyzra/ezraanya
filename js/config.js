/* Site settings. Edit the values between the quotes, save, and upload this one file. */

// Google Sheet form receiver: the Web app URL from Apps Script (it ends in /exec).
// Leave empty to send forms through FormSubmit instead.
window.EA_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwvEKxxlLww3SrRlsdxGZo1c6mDKu06ypGfUq8DP3dgH6-jS7gdwucOMVdxqiTc6KvbgQ/exec';

// Microsoft Clarity project ID (heatmaps and session recordings).
window.EA_CLARITY_ID = 'za12929qoy';

// Substack publications shown on the Writing page (the browser uses this list as a backup;
// the GitHub Action reads the same list from scripts/fetch-substack.mjs).
window.EA_SUBSTACKS = [
  { site: 'https://theezraanya.substack.com', label: 'Letters' }
];

// Names shown on the Writing page. Left side: the Substack label or section name. Right side: what visitors see.
window.EA_TAG_LABELS = {
  'Essay': 'Letters',
  'Authentic Intelligence': 'Publications'
};

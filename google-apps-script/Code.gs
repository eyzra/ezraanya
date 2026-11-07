/**
 * theezraanya.com form receiver, automatic replies and Sheet mailer
 *
 * Paste this into Extensions > Apps Script on your Google Sheet, then deploy it as a Web app.
 * After any change: Deploy > Manage deployments > pencil > Version: New version > Deploy.
 *
 * What it does
 * 1. Every form on the site posts here. Each form gets its own tab and every answer its own column.
 * 2. You get a copy of each submission at NOTIFY_EMAIL.
 * 3. The person who filled in the form gets a branded confirmation email (AUTO_REPLIES below).
 * 4. The Sheet gets an "Ezra" menu for emailing everyone on a tab from a template you write
 *    in the "Templates" tab, such as sending the Reflections link to every registrant.
 */

/* ===================== SETTINGS ===================== */

// Where your copy of each submission goes.
const NOTIFY_EMAIL = 'message.theezraanya@gmail.com';

// The name people see in their inbox.
const SENDER_NAME = 'Ezra Anya';

// When someone presses Reply on an automatic email, it goes here.
const REPLY_TO = 'message.theezraanya@gmail.com';

// Leave empty to send from the Google account that owns this script.
// To send from another address, first add it in Gmail: Settings > Accounts > Send mail as.
// Then put that address here, save, and approve the new permission when Google asks.
const FROM_ALIAS = '';

// Turn automatic confirmation emails on (true) or off (false).
const AUTO_REPLY = true;

const SITE = 'https://theezraanya.com';
const LOGO = SITE + '/assets/img/wordmark-light.png';
const ORANGE = '#F26B1D';

const TABS = {
  clarity: 'Clarity Conversation',
  contact: 'Contact',
  speaking: 'Speaking',
  thrivetribe: 'ThriveTribe',
  reflections: 'Reflections'
};

/*
 * Automatic replies, one per form.
 * {{first}} is the person's first name. Any form field can be used the same way, for example
 * {{enquiry}} or {{session}} on the Reflections form. Each item in "lines" becomes a paragraph.
 */
const AUTO_REPLIES = {
  reflections: {
    subject: 'Your seat is saved for Reflections W/ TEA',
    eyebrow: 'Reflections W/ TEA',
    heading: 'See you there, {{first}}.',
    lines: [
      'Your registration for {{enquiry}} has come through.',
      'We meet on {{session}}. The session link comes to this email address before we start, so keep an eye on your inbox and your spam folder.',
      'If you sent a question with your registration, Ezra has it and will keep it in mind for the session.'
    ],
    button: { label: 'Message Ezra on WhatsApp', url: 'https://wa.me/2347012954115' }
  },
  thrivetribe: {
    subject: 'Welcome to TheThriveTribe, {{first}}',
    eyebrow: 'TheThriveTribe',
    heading: 'Welcome to the tribe.',
    lines: [
      'Hi {{first}}, your registration for TheThriveTribe has come through.',
      'TheThriveTribe is a 90-day mentorship sprint, and the programme fee is {{programme_fee}}. Payment details and your cohort start date will reach you by email and WhatsApp.',
      'Have a question before then? Reply to this email.'
    ],
    button: { label: 'Read about the programme', url: SITE + '/thrivetribe.html' }
  },
  contact: {
    subject: 'Ezra has your message',
    eyebrow: 'Message received',
    heading: 'Thank you, {{first}}.',
    lines: [
      'Your message has reached Ezra, and you will get a reply within two working days.',
      'If your matter is urgent, reply to this email and say so in the first line.'
    ],
    button: { label: 'Book a Clarity Conversation', url: SITE + '/clarity.html' }
  },
  speaking: {
    subject: 'Your speaking request has arrived',
    eyebrow: 'Speaking and training',
    heading: 'Thank you, {{first}}.',
    lines: [
      'Your request for Ezra to speak has come through, with the details you shared about your event.',
      'You will get a reply within two working days about the date and the best format for your audience.'
    ],
    button: { label: 'Download the press kit', url: SITE + '/press-kit.html' }
  },
  clarity: {
    subject: 'Your Clarity Conversation answers are in',
    eyebrow: 'Clarity Conversation',
    heading: 'Thank you, {{first}}.',
    lines: [
      'Your answers have reached Ezra. He reads them before you meet, so the conversation starts where it matters.',
      'If you closed the page before choosing a time, use the button below to pick one.'
    ],
    button: { label: 'Choose a time', url: 'https://calendly.com/ezraanya/talk-w-tea' }
  }
};

/* ===================== FORM RECEIVER ===================== */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  let data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data._honey) return json_({ ok: true }); // spam trap filled in: ignore quietly

    const key = formKey_(data);
    const tabName = TABS[key] || 'Other';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    const fields = Object.keys(data).filter(function (k) { return k.charAt(0) !== '_' && k !== 'page'; });

    let headers = sheet.getLastRow() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
    if (!headers.length) {
      headers = ['Submitted at', 'Page'];
      sheet.getRange(1, 1, 1, 2).setValues([headers]);
    }
    fields.forEach(function (f) {
      if (headers.indexOf(f) === -1) {
        headers.push(f);
        sheet.getRange(1, headers.length).setValue(f);
      }
    });
    const row = headers.map(function (h) {
      if (h === 'Submitted at') return new Date();
      if (h === 'Page') return data.page || '';
      return data[h] == null ? '' : String(data[h]);
    });
    sheet.appendRow(row);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0B0B0B').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    lock.releaseLock();

    // The row is saved. Emails come next, and a mail problem never loses the row.
    try { notify_(data, fields, tabName); } catch (err) { console.error('Notify failed: ' + err); }
    if (AUTO_REPLY) {
      try { autoReply_(key, data); } catch (err) { console.error('Auto reply failed: ' + err); }
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() {
  return json_({ ok: true, service: 'theezraanya.com forms' });
}

// Works out which form sent the data, even if the page address is unusual.
function formKey_(data) {
  const named = String(data._form || '').toLowerCase();
  if (TABS[named]) return named;
  const hay = (String(data.page || '') + ' ' + String(data._subject || '') + ' ' + String(data.enquiry || '')).toLowerCase();
  if (hay.indexOf('reflection') > -1) return 'reflections';
  if (hay.indexOf('thrive') > -1) return 'thrivetribe';
  if (hay.indexOf('speak') > -1) return 'speaking';
  if (hay.indexOf('clarity') > -1) return 'clarity';
  if (hay.indexOf('contact') > -1 || hay.indexOf('enquiry') > -1) return 'contact';
  return named;
}

function notify_(data, fields, tabName) {
  const rows = fields.map(function (f) {
    return '<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:top;font-weight:600;width:38%">' + esc_(f) +
      '</td><td style="padding:10px 14px;border-bottom:1px solid #eee">' + esc_(data[f]).replace(/\n/g, '<br>') + '</td></tr>';
  }).join('');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">' +
    '<p style="margin:0 0 6px;color:' + ORANGE + ';font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">' + esc_(tabName) + '</p>' +
    '<p style="margin:0 0 16px">New submission from theezraanya.com' + (data.page ? ' (' + esc_(data.page) + ')' : '') + '. It is also saved in your Google Sheet.</p>' +
    '<table style="border-collapse:collapse;width:100%;max-width:720px">' + rows + '</table></div>';
  const options = { name: 'theezraanya.com', htmlBody: html };
  const reply = emailOf_(data);
  if (reply) options.replyTo = reply;
  MailApp.sendEmail(NOTIFY_EMAIL, data._subject || ('New ' + tabName + ' submission'), plain_(html), options);
}

function autoReply_(key, data) {
  const t = AUTO_REPLIES[key];
  const to = emailOf_(data);
  if (!t || !to) return;
  send_(to, fill_(t.subject, data), {
    eyebrow: fill_(t.eyebrow, data),
    heading: fill_(t.heading, data),
    lines: t.lines.map(function (l) { return fill_(l, data); }),
    button: t.button
  });
}

/* ===================== SHEET MENU: EMAIL A WHOLE TAB ===================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Ezra')
    .addItem('Email everyone on this tab', 'sendTemplateToTab')
    .addItem('Send a test of a template to myself', 'sendTemplateTest')
    .addSeparator()
    .addItem('Set up the Templates tab', 'setupTemplates')
    .addItem('Emails I can still send today', 'showQuota')
    .addToUi();
}

function setupTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Templates');
  if (sh) { ss.setActiveSheet(sh); SpreadsheetApp.getUi().alert('The Templates tab already exists.'); return; }
  sh = ss.insertSheet('Templates');
  sh.getRange(1, 1, 1, 6).setValues([['Template name', 'Subject', 'Heading', 'Message', 'Button text', 'Button link']])
    .setFontWeight('bold').setBackground('#0B0B0B').setFontColor('#FFFFFF');
  sh.getRange(2, 1, 2, 6).setValues([
    ['Reflections link',
     'Tonight at 7PM: your link for Reflections W/ TEA',
     'Here is your link, {{first}}.',
     'Reflections W/ TEA starts at 7PM WAT.\n\nJoin from a quiet place with a notebook, and come in five minutes early so we can start on time.\n\nSee you soon.',
     'Join the session', 'https://meet.google.com/your-link'],
    ['Reflections thank you',
     'Thank you for coming to Reflections W/ TEA',
     'Thank you for showing up, {{first}}.',
     'Thank you for spending your evening with us.\n\nWrite down the one thing you are taking from tonight and act on it this week.\n\nThe next edition opens for registration soon on the website.',
     'See the next edition', SITE + '/reflections.html']
  ]);
  sh.setColumnWidths(1, 6, 220);
  sh.getRange(2, 4, 2, 1).setWrap(true);
  sh.setFrozenRows(1);
  ss.setActiveSheet(sh);
  SpreadsheetApp.getUi().alert('Templates tab ready. Write a new row for each email. Use {{first}} for the first name, and a blank line in the Message to start a new paragraph.');
}

function sendTemplateTest() {
  const ui = SpreadsheetApp.getUi();
  const tpl = pickTemplate_(); if (!tpl) return;
  const me = Session.getActiveUser().getEmail() || NOTIFY_EMAIL;
  send_(me, fill_(tpl.subject, { name: 'Ezra Anya' }), render_(tpl, { name: 'Ezra Anya' }));
  ui.alert('A test of "' + tpl.name + '" went to ' + me + '.');
}

function sendTemplateToTab() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() === 'Templates') { ui.alert('Open the tab with the people you want to email first, such as Reflections.'); return; }
  const tpl = pickTemplate_(); if (!tpl) return;

  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  let sentCol = headers.indexOf('Emails sent');
  if (sentCol === -1) { sentCol = headers.length; sh.getRange(1, sentCol + 1).setValue('Emails sent').setFontWeight('bold').setBackground('#0B0B0B').setFontColor('#FFFFFF'); }

  const people = [];
  for (let r = 1; r < values.length; r++) {
    const row = {}; headers.forEach(function (h, i) { row[h] = values[r][i]; });
    const to = emailOf_(row);
    const already = String(values[r][sentCol] || '').split(' | ').indexOf(tpl.name) > -1;
    if (to && !already) people.push({ r: r, to: to, row: row, prev: String(values[r][sentCol] || '') });
  }
  if (!people.length) { ui.alert('Everyone on this tab has already had "' + tpl.name + '", or no row has an email address.'); return; }
  const left = MailApp.getRemainingDailyQuota();
  const ok = ui.alert('Send "' + tpl.name + '"?', 'This goes to ' + people.length + ' people on the "' + sh.getName() + '" tab. You can send ' + left + ' more emails today.', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;

  let sent = 0;
  for (let i = 0; i < people.length && sent < left; i++) {
    const p = people[i];
    send_(p.to, fill_(tpl.subject, p.row), render_(tpl, p.row));
    sh.getRange(p.r + 1, sentCol + 1).setValue(p.prev ? p.prev + ' | ' + tpl.name : tpl.name);
    sent++;
  }
  ui.alert('Sent "' + tpl.name + '" to ' + sent + ' people.' + (sent < people.length ? ' Google\'s daily limit stopped the rest. Run it again tomorrow and it picks up where it stopped.' : ''));
}

function showQuota() {
  SpreadsheetApp.getUi().alert('You can send ' + MailApp.getRemainingDailyQuota() + ' more emails today. The count resets every 24 hours.');
}

function pickTemplate_() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Templates');
  if (!sh) { ui.alert('Run Ezra > Set up the Templates tab first.'); return null; }
  const rows = sh.getDataRange().getValues().slice(1).filter(function (r) { return r[0] && r[1]; });
  if (!rows.length) { ui.alert('The Templates tab has no templates yet.'); return null; }
  const list = rows.map(function (r, i) { return (i + 1) + '. ' + r[0]; }).join('\n');
  const res = ui.prompt('Which template?', list + '\n\nType the number:', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  const r = rows[parseInt(res.getResponseText(), 10) - 1];
  if (!r) { ui.alert('That number is not on the list.'); return null; }
  return { name: String(r[0]), subject: String(r[1]), heading: String(r[2] || ''), message: String(r[3] || ''), buttonText: String(r[4] || ''), buttonLink: String(r[5] || '') };
}

function render_(tpl, row) {
  return {
    eyebrow: 'theezraanya',
    heading: fill_(tpl.heading, row),
    lines: fill_(tpl.message, row).split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(String),
    button: tpl.buttonText && tpl.buttonLink ? { label: fill_(tpl.buttonText, row), url: tpl.buttonLink } : null
  };
}

/* ===================== EMAIL DESIGN ===================== */

function send_(to, subject, c) {
  const html = layout_(c);
  const options = { htmlBody: html, name: SENDER_NAME, replyTo: REPLY_TO };
  if (FROM_ALIAS) {
    options.from = FROM_ALIAS;
    GmailApp.sendEmail(to, subject, plain_(html), options);
  } else {
    MailApp.sendEmail(to, subject, plain_(html), options);
  }
}

function layout_(c) {
  const paras = (c.lines || []).map(function (l) {
    return '<p style="margin:0 0 18px;font-family:Georgia,\'Times New Roman\',serif;font-size:17px;line-height:1.65;color:#2a2a2a">' + esc_(l).replace(/\n/g, '<br>') + '</p>';
  }).join('');
  const btn = c.button && c.button.url ?
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 6px"><tr><td style="background:' + ORANGE + ';border-radius:999px">' +
    '<a href="' + esc_(c.button.url) + '" style="display:inline-block;padding:15px 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;text-decoration:none">' + esc_(c.button.label) + ' &rarr;</a></td></tr></table>' : '';
  return '<!doctype html><html><body style="margin:0;padding:0;background:#efede8">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efede8;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff">' +
    // header
    '<tr><td style="background:#0B0B0B;padding:26px 36px;border-bottom:3px solid ' + ORANGE + '">' +
    '<img src="' + LOGO + '" width="150" alt="theezraanya" style="display:block;border:0;width:150px;height:auto;color:#ffffff;font-family:Arial,sans-serif;font-size:20px;font-weight:700"></td></tr>' +
    // body
    '<tr><td style="padding:40px 36px 30px">' +
    (c.eyebrow ? '<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:' + ORANGE + '">' + esc_(c.eyebrow) + '</p>' : '') +
    (c.heading ? '<h1 style="margin:0 0 22px;font-family:Arial,\'Helvetica Neue\',sans-serif;font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.01em;color:#0B0B0B">' + esc_(c.heading) + '</h1>' : '') +
    paras + btn +
    '<p style="margin:28px 0 0;font-family:Georgia,\'Times New Roman\',serif;font-style:italic;font-size:17px;color:#0B0B0B">Ezra Anya</p>' +
    '</td></tr>' +
    // footer
    '<tr><td style="background:#0B0B0B;padding:22px 36px;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#bdbdbd">' +
    'Believe. Build. Become.<br>' +
    '<a href="' + SITE + '" style="color:#ffffff;text-decoration:none">theezraanya.com</a> &nbsp;&middot;&nbsp; ' +
    '<a href="https://theezraanya.substack.com" style="color:#ffffff;text-decoration:none">Substack</a> &nbsp;&middot;&nbsp; ' +
    '<a href="https://wa.me/2347012954115" style="color:#ffffff;text-decoration:none">WhatsApp</a><br>' +
    '<span style="color:#8a8a8a">You are getting this because you filled in a form on theezraanya.com. Reply to this email if you would rather not hear from us.</span>' +
    '</td></tr></table></td></tr></table></body></html>';
}

/* ===================== HELPERS ===================== */

function emailOf_(d) {
  const keys = ['_replyto', 'email', 'Email', '2. Email address', 'Email address'];
  for (let i = 0; i < keys.length; i++) {
    const v = String(d[keys[i]] || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return v;
  }
  return '';
}

function nameOf_(d) {
  return String(d.name || d.Name || d['1. Full name'] || d['Full name'] || '').trim();
}

// Replaces {{first}}, {{name}} and any {{field}} with the person's answers.
function fill_(text, d) {
  const name = nameOf_(d);
  const first = name.split(/\s+/)[0] || 'there';
  return String(text || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, function (m, k) {
    if (k === 'first') return first;
    if (k === 'name') return name || 'there';
    return d[k] == null || d[k] === '' ? '' : String(d[k]);
  });
}

function plain_(html) {
  return String(html).replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|h1|tr)>/g, '\n\n').replace(/<[^>]+>/g, '')
    .replace(/&rarr;/g, '>').replace(/&nbsp;/g, ' ').replace(/&middot;|·/g, '·').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

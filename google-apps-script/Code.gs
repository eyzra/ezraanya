/**
 * theezraanya.com form receiver
 * Paste this into Extensions > Apps Script on your Google Sheet, then deploy it as a Web app.
 * Every form on the site posts here. Each form gets its own tab, every answer gets its own
 * column, and a copy of each submission is emailed to NOTIFY_EMAIL.
 */
const NOTIFY_EMAIL = 'message.theezraanya@gmail.com';

const TABS = {
  clarity: 'Clarity Conversation',
  contact: 'Contact',
  speaking: 'Speaking',
  thrivetribe: 'ThriveTribe',
  reflections: 'Reflections'
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data._honey) return json_({ ok: true }); // spam trap filled in: ignore quietly

    const tabName = TABS[String(data._form || '').toLowerCase()] || 'Other';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
    const fields = Object.keys(data).filter(function (k) { return k.charAt(0) !== '_' && k !== 'page'; });

    // header row: fixed first columns, then one column per question, added as new questions appear
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

    // email copy
    const rows = fields.map(function (f) {
      return '<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;vertical-align:top;font-weight:600;width:38%">' + esc_(f) +
             '</td><td style="padding:10px 14px;border-bottom:1px solid #eee">' + esc_(data[f]).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');
    const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">' +
      '<p style="margin:0 0 6px;color:#F26B1D;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">' + esc_(tabName) + '</p>' +
      '<p style="margin:0 0 16px">New submission from theezraanya.com' + (data.page ? ' (' + esc_(data.page) + ')' : '') + '. It is also saved in your Google Sheet.</p>' +
      '<table style="border-collapse:collapse;width:100%;max-width:720px">' + rows + '</table></div>';
    const options = { to: NOTIFY_EMAIL, subject: data._subject || ('New ' + tabName + ' submission'), htmlBody: html, name: 'theezraanya.com' };
    const reply = String(data._replyto || data.email || data['2. Email address'] || '');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply)) options.replyTo = reply;
    MailApp.sendEmail(options);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'theezraanya.com forms' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

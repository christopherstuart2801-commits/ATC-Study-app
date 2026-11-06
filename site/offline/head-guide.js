/* VECTOR Head Guide copy. Truthful labels only. No accounts, no activation code, no network. */
(function (root) {
  'use strict';

  var GUIDE = {
    id: 'vector-head-guide',
    title: 'VECTOR Head Guide',
    version: '0.8.37',
    lead: 'For a successor or a training chief. Open it with no login. This guide does not grant access.',
    sections: [
      {
        id: 'version',
        title: 'What this version is',
        badge: 'NOW',
        html: '<p>VECTOR ATC is an on-device study aid for the public material already loaded in this app. No account is required.</p><p>Installing it adds an icon on this device. It is not an app-store download, and it is not a Department of Defense approval or endorsement.</p><p>The guide route is <b>#guide</b>. The feedback route is <b>#feedback</b>. Both open inside this app.</p>'
      },
      {
        id: 'office',
        title: 'Training office',
        badge: 'LATER',
        html: '<p>Later phases are planned so this app can help the training office. They are not enabled in this version:</p><ul><li>Rosters — not enabled</li><li>Office view of progress — not enabled. Marks a trainee makes stay on that device.</li><li>Tests the office assigns or reviews — not enabled. On-device practice tests in Learn work now.</li><li>Reviews — not enabled</li></ul><p>When those phases are enabled, the office would work from rosters, progress, tests, and reviews here. This version has no shared office account and no admin tools.</p>'
      },
      {
        id: 'pubs',
        title: 'Staying current',
        badge: 'PLANNED',
        html: '<p>Reference opens the public publications bundled with this version. An official-publication updater is planned so a later version can take official updates.</p><p>This version does not include that updater. It does not download a new edition on its own. A file saved on this device is not automatically the current official edition.</p><p>When maintainers publish a new app version on this site, the app can ask you to reload. That prompt is an app update you choose. It is not the publication updater, and it does not erase study progress.</p>'
      },
      {
        id: 'offline',
        title: 'Offline study',
        badge: 'NOW',
        html: '<p>Open the site once while online. This device then saves the app shell, this guide, and the public study banks already in the app (questions, lessons, flashcards, and the local search data).</p><p>Publication PDFs are saved from a fixed list of files that ship with this version. Device shows how many were saved and the name of any that failed. A failed file is not replaced with another page. Reload while offline to use what was saved.</p><p>Windows Chrome or Edge: use the Install button when it appears, the install icon in the address bar, or the menu → Apps → Install VECTOR ATC. iPhone: in Safari, tap Share, then Add to Home Screen.</p><p>Fonts from the internet and the optional photo text reader are not saved. Nothing from another website is cached. Restricted material, credentials, and private accounts are not part of this version.</p>'
      },
      {
        id: 'backup',
        title: 'Device backup',
        badge: 'NOW',
        html: '<p>Device → Export backup downloads one JSON file of this device\'s study profile: trainee name and initials, study marks, checks, lessons, flashcard progress, tests, custom sets, open pocket keys, and any other vatc.* values stored here.</p><p>Import reads a file only after you choose it, checks it, and asks you to confirm before it replaces progress on this device. If the file is not valid, or the write fails, current progress is left as it was.</p><p>This is a device backup you keep, not cloud sync. Nothing is uploaded.</p>'
      },
      {
        id: 'chief',
        title: 'Training chief',
        badge: 'LATER',
        html: '<p>A later accounts phase is planned to activate a training-chief role with a one-time code issued outside this app, and to transfer that role to a successor later.</p><p>This version does not create accounts, does not accept a chief code, and does not change anyone\'s permissions. This guide cannot elevate access. No activation code is stored in the app.</p>'
      },
      {
        id: 'feedback',
        title: 'Report feedback',
        badge: 'NOW',
        html: '<p>Report feedback opens a page on this device. It builds a note you can copy. Opening it does not send email and does not contact a server.</p>'
      }
    ]
  };

  function feedbackDraft(note, snap) {
    snap = snap || {};
    var refs = snap.refs || {};
    var lines = [
      'VECTOR ATC feedback',
      'Copied on this device. The app did not send it.',
      '',
      'Version: ' + (snap.version || GUIDE.version),
      'Online: ' + (snap.online ? 'yes' : 'no'),
      'Account: none on this version',
      'Service worker: ' + (snap.sw || 'unknown'),
      'Shell saved: ' + (snap.shellReady ? 'yes' : 'no'),
      'Publications saved: ' + (refs.cached || 0) + '/' + (refs.total || 0)
    ];
    var failed = refs.failed || [];
    if (failed.length) {
      lines.push('Save errors: ' + failed.slice(0, 8).map(function (f) { return String(f.url || f).split('/').pop(); }).join(', '));
    }
    lines.push('', 'Note:', String(note || '').slice(0, 4000));
    return lines.join('\n');
  }

  GUIDE.feedbackDraft = feedbackDraft;
  root.VATC_HEAD_GUIDE = GUIDE;
  if (typeof module !== 'undefined' && module.exports) module.exports = GUIDE;
})(typeof globalThis !== 'undefined' ? globalThis : this);

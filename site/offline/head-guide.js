/* ATCFO onboarding. Short and plain. This page does not sign anyone in. */
(function (root) {
  'use strict';

  var GUIDE = {
    id: 'vector-head-guide',
    title: 'ATCFO onboarding',
    version: '0.8.49',
    lead: 'For a facility training officer. Reading this does not sign you in and does not grant access.',
    sections: [
      {
        id: 'crews',
        title: 'Crews and codes',
        badge: 'NOW',
        html: '<p>Sign in with a demo admin account. Open Admin. Choose Crew 1 or Crew 2.</p><p>Access codes on that page are demo labels from the bundled roster. They do not sign anyone in and they do not change who can open the app.</p><p>The roster lists the demo names on that crew. It is not a live personnel file.</p>'
      },
      {
        id: 'pubs',
        title: 'Publications',
        badge: 'NOW',
        html: '<p>Reference opens the publications already in this copy: JO 7110.65, the facility manual, and the plates that shipped with it.</p><p>This version does not download a newer official edition. A file on this device is not automatically the current official publication.</p>'
      },
      {
        id: 'use',
        title: 'How to use the app',
        badge: 'NOW',
        html: '<p>Home is the position list. Ask searches the loaded publications. Learn is the lesson cards and tests. Flashcards are the study sets. Reference is the publication shelf.</p><p>Profile is the sign-in. Students see those five study tabs. Admin is only for an admin-side demo role, and it opens the crew page.</p><p>Hours are a personal log on this device. Marks stay in this browser until a server exists.</p>'
      },
      {
        id: 'feedback',
        title: 'Report feedback',
        badge: 'NOW',
        html: '<p>Report feedback builds a note you can copy. Opening it does not send email and does not contact a server.</p>'
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

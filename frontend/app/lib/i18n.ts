export type Language = "hi" | "en";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "hi", label: "हिन्दी" },
  { code: "en", label: "English" },
];

/**
 * Hindi is the default: the devotees this app is built for are at a village
 * ashram in Madhya Pradesh, and English is the second language for most.
 */
export const DEFAULT_LANGUAGE: Language = "hi";

/**
 * Flat key → { hi, en }. Kept as one table rather than per-locale files so a
 * missing translation is impossible to miss when adding a string.
 */
const STRINGS = {
  // --- Login -------------------------------------------------------------
  "login.subtitle": { hi: "जप संकल्प सेवा", en: "Jap Sankalp Seva" },
  "login.mobile": { hi: "मोबाइल नंबर", en: "Mobile number" },
  "login.mobilePlaceholder": { hi: "मोबाइल नंबर", en: "Mobile number" },
  "login.pin": { hi: "लॉगिन पिन", en: "Login PIN" },
  "login.pinPlaceholder": { hi: "आश्रम से मिला पिन", en: "PIN from the ashram" },
  "login.email": { hi: "ईमेल", en: "Email" },
  "login.emailPlaceholder": { hi: "एडमिन ईमेल", en: "Admin email" },
  "login.password": { hi: "पासवर्ड", en: "Password" },
  "login.passwordPlaceholder": { hi: "एडमिन पासवर्ड", en: "Admin password" },
  "login.submit": { hi: "लॉगिन करें", en: "Login" },
  "login.checking": { hi: "जाँच हो रही है…", en: "Checking…" },
  "login.forgotPin": {
    hi: "पिन भूल गए? कृपया आश्रम से संपर्क करें।",
    en: "Forgot your PIN? Please contact the ashram.",
  },
  "login.adminLogin": { hi: "एडमिन लॉगिन", en: "Admin login" },
  "login.backToDevotee": { hi: "भक्त लॉगिन पर वापस", en: "Back to devotee login" },
  "login.failed": { hi: "लॉगिन नहीं हो सका", en: "Login failed" },

  // --- Shell / navigation ------------------------------------------------
  "nav.jap": { hi: "जप", en: "Jap" },
  "nav.progress": { hi: "प्रगति", en: "Progress" },
  "nav.sankalp": { hi: "संकल्प", en: "Sankalp" },
  "nav.me": { hi: "मेरा", en: "Me" },
  "shell.greeting": { hi: "नमस्ते, {name}", en: "Namaste, {name}" },
  "shell.devotee": { hi: "भक्त", en: "Devotee" },
  "shell.pendingSync": {
    hi: "{count} जप इस डिवाइस पर सुरक्षित है — ऑनलाइन होते ही सिंक होगा",
    en: "{count} jap saved on this device — will sync when you're online",
  },

  // --- Jap screen --------------------------------------------------------
  "jap.today": { hi: "आज", en: "Today" },
  "jap.malas": { hi: "{count} माला", en: "{count} malas" },
  "jap.mala": { hi: "{count} माला", en: "{count} mala" },
  "jap.streak": { hi: "निरंतरता", en: "Streak" },
  "jap.keepAlive": { hi: "बनाए रखें!", en: "Keep it alive!" },
  "jap.logToStart": { hi: "शुरू करने के लिए दर्ज करें", en: "Log to start" },
  "jap.addManually": { hi: "जप स्वयं जोड़ें", en: "Add jap manually" },
  "jap.manualTitle": { hi: "जप स्वयं जोड़ें", en: "Add Jap Manually" },
  "jap.manualSubtitle": {
    hi: "पिछली तारीख या ज्ञात संख्या के लिए",
    en: "For a past date or a known total",
  },
  "jap.count": { hi: "जप संख्या", en: "Jap count" },
  "jap.countPlaceholder": { hi: "जैसे 1100", en: "e.g. 1100" },
  "jap.date": { hi: "तारीख", en: "Date" },
  "jap.notes": { hi: "टिप्पणी", en: "Notes" },
  "jap.notesHint": { hi: "वैकल्पिक", en: "Optional" },
  "jap.save": { hi: "जप सुरक्षित करें", en: "Save Jap" },
  "jap.saving": { hi: "सुरक्षित हो रहा है…", en: "Saving…" },
  "jap.cancel": { hi: "रद्द करें", en: "Cancel" },
  "jap.savedToast": {
    hi: "{count} जप सुरक्षित। जय हो! 🙏",
    en: "{count} jap saved. Keep going! 🙏",
  },
  "jap.savedSimple": { hi: "जप सुरक्षित। जय हो! 🙏", en: "Jap saved. Keep going! 🙏" },
  "jap.savedOffline": {
    hi: "आपके डिवाइस पर सुरक्षित। ऑनलाइन होते ही सिंक हो जाएगा।",
    en: "Saved on your device. It will sync when you're back online.",
  },
  "jap.saveFailed": { hi: "जप सुरक्षित नहीं हो सका", en: "Could not save jap" },
  "jap.synced": {
    hi: "{count} ऑफ़लाइन जप सिंक हो गए 🙏",
    en: "{count} offline jap entries synced 🙏",
  },

  // --- Tap counter -------------------------------------------------------
  "tap.title": { hi: "जप काउंटर", en: "Tap Counter" },
  "tap.subtitle": {
    hi: "हर जप पर घेरे को दबाएँ — 108 बार में एक माला पूरी",
    en: "Tap the circle for each jap — 108 taps complete one mala",
  },
  "tap.tapToChant": { hi: "जप करें", en: "Tap to chant" },
  "tap.malasDone": { hi: "माला पूर्ण", en: "Malas done" },
  "tap.totalTaps": { hi: "कुल जप", en: "Total taps" },
  "tap.reset": { hi: "रीसेट", en: "Reset" },
  "tap.saveCount": { hi: "{count} जप सुरक्षित करें", en: "Save {count} jap" },
  "tap.malaComplete": { hi: "🙏 माला {n} पूर्ण!", en: "🙏 Mala {n} complete!" },

  // --- Progress screen ---------------------------------------------------
  "progress.todayJap": { hi: "आज का जप", en: "Today's Jap" },
  "progress.currentStreak": { hi: "वर्तमान निरंतरता", en: "Current Streak" },
  "progress.lifetimeJap": { hi: "कुल जप", en: "Lifetime Jap" },
  "progress.days": { hi: "{count} दिन", en: "{count} days" },
  "progress.day": { hi: "{count} दिन", en: "{count} day" },
  "progress.share": { hi: "आज की प्रगति साझा करें", en: "Share today's progress" },
  "progress.historyTitle": { hi: "मेरा जप इतिहास", en: "My Jap History" },
  "progress.entries": { hi: "{count} प्रविष्टियाँ", en: "{count} entries" },
  "progress.noEntriesTitle": { hi: "अभी कोई जप दर्ज नहीं", en: "No jap entries yet" },
  "progress.noEntriesText": {
    hi: "आपका दर्ज किया जप यहाँ दिखेगा। शुरुआत करने के लिए पहला जप जोड़ें।",
    en: "Your recorded jap will appear here. Add your first entry to begin.",
  },
  "progress.general": { hi: "सामान्य", en: "General" },
  "progress.japUnit": { hi: "जप", en: "jap" },
  "progress.shareText": {
    hi: "🙏 आज मैंने {count} जप{mala} पूर्ण किए।{streak}",
    en: "🙏 Today I completed {count} jap{mala} on Jap Tracker.{streak}",
  },
  "progress.shareStreak": {
    hi: " मेरी निरंतरता: {days} दिन 🔥",
    en: " My streak: {days} days 🔥",
  },

  // --- Sankalp screen ----------------------------------------------------
  "sankalp.mine": { hi: "मेरा संकल्प", en: "My Sankalp" },
  "sankalp.completed": { hi: "पूर्ण", en: "Completed" },
  "sankalp.progressLabel": { hi: "संकल्प प्रगति", en: "Sankalp progress" },
  "sankalp.tileCompleted": { hi: "पूर्ण", en: "Completed" },
  "sankalp.tileTarget": { hi: "लक्ष्य", en: "Target" },
  "sankalp.tileRemaining": { hi: "शेष", en: "Remaining" },
  "sankalp.tileDaysLeft": { hi: "दिन शेष", en: "Days Left" },
  "sankalp.milestones": { hi: "पड़ाव", en: "Milestones" },
  "sankalp.noneTitle": { hi: "अभी कोई सक्रिय संकल्प नहीं", en: "No active sankalp yet" },
  "sankalp.noneText": {
    hi: "आश्रम प्रबंधक ने अभी संकल्प नहीं दिया है। आप जप टैब से सामान्य जप दर्ज कर सकते हैं।",
    en: "The ashram admin has not assigned an active sankalp. You can still record general jap from the Jap tab.",
  },

  // --- Celebration -------------------------------------------------------
  "celebrate.eyebrow": { hi: "संकल्प पूर्ण", en: "Sankalp Complete" },
  "celebrate.heading": { hi: "हरि ॐ! बधाई हो 🙏", en: "Hari Om! Badhai ho 🙏" },
  "celebrate.body": {
    hi: "आपने {title} — {count} जप पूर्ण किए।",
    en: "You have completed {title} — {count} jap.",
  },
  "celebrate.blessing": {
    hi: "यह साधना आपको शांति और स्थिरता प्रदान करे।",
    en: "May this sadhana bring you peace and steadiness.",
  },
  "celebrate.share": { hi: "यह क्षण साझा करें", en: "Share this moment" },
  "celebrate.continue": { hi: "आगे बढ़ें", en: "Continue" },
  "celebrate.shareText": {
    hi: "🙏 ठाकुर जी की कृपा से मैंने अपना संकल्प पूर्ण किया — {title}, {count} जप।",
    en: "🙏 By Thakur ji's grace I have completed my sankalp — {title}, {count} jap.",
  },

  // --- Me / profile ------------------------------------------------------
  "me.totalJap": { hi: "कुल {count} जप पूर्ण", en: "{count} jap completed in total" },
  "me.mobile": { hi: "मोबाइल", en: "Mobile" },
  "me.email": { hi: "ईमेल", en: "Email" },
  "me.location": { hi: "पता", en: "Location" },
  "me.notAdded": { hi: "दर्ज नहीं", en: "Not added" },
  "me.edit": { hi: "मेरी जानकारी बदलें", en: "Edit my details" },
  "me.logout": { hi: "लॉगआउट", en: "Logout" },
  "me.language": { hi: "भाषा", en: "Language" },

  // --- Profile edit ------------------------------------------------------
  "profile.title": { hi: "मेरी जानकारी बदलें", en: "Edit My Details" },
  "profile.subtitle": { hi: "अपना पता अद्यतन रखें", en: "Keep your address up to date" },
  "profile.village": { hi: "गाँव", en: "Village" },
  "profile.city": { hi: "शहर", en: "City" },
  "profile.tehsil": { hi: "तहसील", en: "Tehsil" },
  "profile.district": { hi: "ज़िला", en: "District" },
  "profile.state": { hi: "राज्य", en: "State" },
  "profile.lockedNote": {
    hi: "आपका नाम और मोबाइल नंबर आपकी लॉगिन जानकारी है — बदलने के लिए आश्रम से संपर्क करें।",
    en: "Your name and mobile number are your login details — please contact the ashram to change them.",
  },
  "profile.save": { hi: "परिवर्तन सुरक्षित करें", en: "Save changes" },
  "profile.saving": { hi: "सुरक्षित हो रहा है…", en: "Saving…" },
  "profile.cancel": { hi: "रद्द करें", en: "Cancel" },
  "profile.updated": { hi: "आपकी जानकारी अद्यतन हो गई 🙏", en: "Your details have been updated 🙏" },
  "profile.offline": {
    hi: "आप ऑफ़लाइन हैं — नेटवर्क आने पर पुनः प्रयास करें।",
    en: "You're offline — please try again when you have signal.",
  },
  "profile.updateFailed": {
    hi: "आपकी जानकारी अद्यतन नहीं हो सकी",
    en: "Could not update your details",
  },

  // --- Reminder ----------------------------------------------------------
  "reminder.title": { hi: "दैनिक जप स्मरण", en: "Daily jap reminder" },
  "reminder.text": {
    hi: "जिस दिन जप दर्ज न हो, शाम को एक स्मरण मिलेगा।",
    en: "An evening nudge on days you haven't recorded any jap.",
  },
  "reminder.blocked": {
    hi: "आपके ब्राउज़र में इस ऐप के लिए सूचनाएँ बंद हैं।",
    en: "Notifications are blocked for this app in your browser settings.",
  },
  "reminder.turnOn": { hi: "स्मरण चालू करें", en: "Turn on reminder" },
  "reminder.turnOff": { hi: "स्मरण बंद करें", en: "Turn off reminder" },
  "reminder.enabled": {
    hi: "स्मरण चालू। शाम को याद दिलाएँगे 🙏",
    en: "Daily reminder on. We'll nudge you in the evening 🙏",
  },
  "reminder.declined": {
    hi: "स्मरण चालू नहीं हुआ — सूचना की अनुमति नहीं मिली।",
    en: "Reminder not enabled — notification permission was declined.",
  },
  "reminder.disabled": { hi: "दैनिक स्मरण बंद कर दिया गया।", en: "Daily reminder turned off." },
  "reminder.updateFailed": { hi: "स्मरण नहीं बदला जा सका", en: "Could not update reminder" },

  // --- Admin: navigation & shared ---------------------------------------
  "admin.navHome": { hi: "होम", en: "Home" },
  "admin.navDevotees": { hi: "भक्त", en: "Devotees" },
  "admin.navSankalp": { hi: "संकल्प", en: "Sankalp" },
  "admin.navReports": { hi: "रिपोर्ट", en: "Reports" },
  "admin.devotee": { hi: "भक्त", en: "Devotee" },
  "admin.devotees": { hi: "भक्त", en: "Devotees" },
  "admin.totalJap": { hi: "कुल जप", en: "Total Jap" },
  "admin.activeSankalp": { hi: "सक्रिय संकल्प", en: "Active Sankalp" },
  "admin.completed": { hi: "पूर्ण", en: "Completed" },
  "admin.lifetimeJap": { hi: "कुल जप", en: "Lifetime Jap" },
  "admin.entriesRecorded": { hi: "दर्ज प्रविष्टियाँ", en: "Entries Recorded" },
  "admin.sankalpProgress": { hi: "संकल्प प्रगति", en: "Sankalp progress" },
  "admin.refresh": { hi: "ताज़ा करें", en: "Refresh" },
  "admin.back": { hi: "← भक्तों पर वापस", en: "← Back to devotees" },

  // --- Admin: devotees ---------------------------------------------------
  "admin.newDevotee": { hi: "नया भक्त + पहला संकल्प", en: "New Devotee + First Sankalp" },
  "admin.devoteeName": { hi: "भक्त का नाम", en: "Devotee name" },
  "admin.fullName": { hi: "पूरा नाम", en: "Full name" },
  "admin.email": { hi: "ईमेल", en: "Email" },
  "admin.mobile": { hi: "मोबाइल नंबर", en: "Mobile number" },
  "admin.mobileHint": { hi: "भक्त इसी से लॉगिन करेगा", en: "Used by the devotee to log in" },
  "admin.state": { hi: "राज्य", en: "State" },
  "admin.firstSankalp": { hi: "पहला संकल्प", en: "First Sankalp" },
  "admin.sankalpTitle": { hi: "संकल्प का नाम", en: "Sankalp title" },
  "admin.targetCount": { hi: "लक्ष्य जप संख्या", en: "Target jap count" },
  "admin.startDate": { hi: "प्रारंभ तिथि", en: "Start date" },
  "admin.endDate": { hi: "समाप्ति तिथि", en: "End date" },
  "admin.registerSubmit": { hi: "पंजीकरण करें और संकल्प दें", en: "Register & Assign Sankalp" },
  "admin.registering": { hi: "पंजीकरण हो रहा है…", en: "Registering…" },
  "admin.devoteeAccess": { hi: "भक्त की लॉगिन जानकारी", en: "Devotee Access" },
  "admin.devoteeAccessSub": {
    hi: "लॉगिन जानकारी देखने के लिए सूची से भक्त चुनें",
    en: "Select a devotee from the list to view login details",
  },
  "admin.noneSelected": {
    hi: "कोई भक्त नहीं चुना। नीचे खोजें और किसी भक्त पर क्लिक करें।",
    en: "No devotee selected. Search and click a devotee below.",
  },
  "admin.loginPin": { hi: "लॉगिन पिन", en: "Login PIN" },
  "admin.copy": { hi: "कॉपी", en: "Copy" },
  "admin.openPanel": { hi: "पैनल खोलें", en: "Open Panel" },
  "admin.resetPin": { hi: "पिन रीसेट करें", en: "Reset PIN" },
  "admin.resetting": { hi: "रीसेट हो रहा है…", en: "Resetting…" },
  "admin.allDevotees": { hi: "सभी भक्त", en: "All Devotees" },
  "admin.registered": { hi: "{count} पंजीकृत", en: "{count} registered" },
  "admin.searchDevotees": { hi: "भक्त खोजें", en: "Search devotees" },
  "admin.searchPlaceholder": {
    hi: "नाम, मोबाइल, ईमेल, पिन, गाँव, ज़िले से खोजें…",
    en: "Search by name, mobile, email, PIN, village, district…",
  },
  "admin.totalJapShort": { hi: "कुल जप", en: "total jap" },
  "admin.noDevoteesTitle": { hi: "अभी कोई भक्त नहीं", en: "No devotees yet" },
  "admin.noDevoteesText": {
    hi: "जप और संकल्प का हिसाब शुरू करने के लिए पहला भक्त पंजीकृत करें।",
    en: "Register your first devotee to begin tracking jap and sankalps.",
  },
  "admin.noDevoteesFound": { hi: "कोई भक्त नहीं मिला", en: "No devotees found" },
  "admin.recentDevotees": { hi: "हाल के भक्त", en: "Recent Devotees" },

  // --- Admin: devotee detail --------------------------------------------
  "admin.japHistory": { hi: "जप इतिहास", en: "Jap History" },
  "admin.noJapTitle": { hi: "अभी कोई जप दर्ज नहीं", en: "No jap entries yet" },
  "admin.noJapText": { hi: "इस भक्त ने अभी कोई जप दर्ज नहीं किया।", en: "This devotee has not recorded any jap." },
  "admin.noActiveSankalp": { hi: "कोई सक्रिय संकल्प नहीं", en: "No active sankalp" },
  "admin.assignFromSankalp": {
    hi: "संकल्प पेज से संकल्प दें।",
    en: "Assign a sankalp from the Sankalp page.",
  },
  "admin.loadFailed": { hi: "यह भक्त नहीं मिल सका", en: "Could not load this devotee" },
  "admin.entries": { hi: "{count} प्रविष्टियाँ", en: "{count} entries" },
  "admin.general": { hi: "सामान्य", en: "General" },
  "admin.remaining": { hi: "शेष", en: "Remaining" },
  "admin.target": { hi: "लक्ष्य", en: "Target" },

  // --- Admin: sankalp ----------------------------------------------------
  "admin.newTarget": { hi: "नया लक्ष्य", en: "New Target" },
  "admin.activeProgress": { hi: "सक्रिय संकल्प प्रगति", en: "Active Sankalp Progress" },
  "admin.allTargets": { hi: "सभी वर्तमान लक्ष्य", en: "All current targets" },
  "admin.noSankalpTitle": { hi: "अभी कोई संकल्प नहीं दिया", en: "No sankalp assigned yet" },
  "admin.noSankalpText": {
    hi: "दिए गए संकल्प और उनकी प्रगति यहाँ दिखेगी।",
    en: "Assigned sankalps and their progress will appear here.",
  },
  "admin.assignToSee": {
    hi: "प्रगति देखने के लिए फ़ॉर्म से लक्ष्य दें।",
    en: "Assign a target using the form to see progress here.",
  },

  // --- Admin: reports ----------------------------------------------------
  "admin.areaSummary": { hi: "क्षेत्र सारांश", en: "Area Summary" },
  "admin.groupedByLocation": { hi: "स्थान अनुसार", en: "Grouped by location" },
  "admin.devoteesInFilter": { hi: "फ़िल्टर में भक्त", en: "Devotees In Filter" },
  "admin.progressTowardTargets": {
    hi: "वर्तमान लक्ष्यों की ओर प्रगति",
    en: "Progress toward current targets",
  },
  "admin.noAreaTitle": { hi: "कोई क्षेत्र डेटा नहीं", en: "No area data" },
  "admin.noAreaText": { hi: "इस फ़िल्टर से कोई स्थान मेल नहीं खाता।", en: "No locations match this filter." },
  "admin.noMatchText": { hi: "चुने गए फ़िल्टर से कोई भक्त मेल नहीं खाता।", en: "No devotees match the selected filters." },

  // --- Admin: quick actions & status ------------------------------------
  "admin.qaRegisterTitle": { hi: "भक्त पंजीकृत करें", en: "Register Devotee" },
  "admin.qaRegisterText": {
    hi: "नया भक्त बनाएँ और साथ ही पहला संकल्प दें।",
    en: "Create a new devotee and assign the first sankalp together.",
  },
  "admin.qaAssignTitle": { hi: "संकल्प दें", en: "Assign Sankalp" },
  "admin.qaAssignText": {
    hi: "मौजूदा भक्त खोजें और उनका अगला लक्ष्य बनाएँ।",
    en: "Search an existing devotee and create their next target.",
  },
  "admin.qaReportsTitle": { hi: "रिपोर्ट", en: "Reports" },
  "admin.qaReportsText": {
    hi: "स्थान और सहभागिता के अनुसार प्रगति देखें।",
    en: "Filter progress by location and participation.",
  },
  "admin.syncing": { hi: "सिंक हो रहा है…", en: "Syncing…" },
  "admin.offline": { hi: "ऑफ़लाइन", en: "Offline" },
  "admin.synced": { hi: "सिंक हो गया", en: "Synced" },

  // --- Admin: toasts & errors -------------------------------------------
  "admin.backendUnreachable": { hi: "सर्वर से संपर्क नहीं हो सका", en: "Backend not reachable" },
  "admin.registerFailed": { hi: "भक्त पंजीकृत नहीं हो सका", en: "Could not register devotee" },
  "admin.registered1": {
    hi: "{name} पंजीकृत हुए और संकल्प दे दिया गया",
    en: "{name} registered and sankalp assigned",
  },
  "admin.emailExists": {
    hi: "यह ईमेल पहले से मौजूद है। भक्त को खोजें और 'संकल्प दें' का उपयोग करें।",
    en: "This email already exists. Search the devotee and use Assign Sankalp.",
  },
  "admin.pinReset": { hi: "लॉगिन पिन रीसेट हो गया", en: "Login PIN reset" },
  "admin.pinResetFailed": { hi: "लॉगिन पिन रीसेट नहीं हो सका", en: "Could not reset login PIN" },
  "admin.copied": { hi: "{label} कॉपी हो गया", en: "{label} copied" },
  "admin.copyFailed": { hi: "कॉपी नहीं हो सका", en: "Could not copy to clipboard" },
  "admin.noMatches": { hi: "कोई मेल नहीं मिला", en: "No matches" },
  "admin.noMatchesText": {
    hi: "इस खोज से कोई भक्त नहीं मिला। कोई और शब्द आज़माएँ।",
    en: "No devotees match this search. Try a different term.",
  },
  "admin.registerFirstText": {
    hi: "फ़ॉर्म से अपना पहला भक्त पंजीकृत करें।",
    en: "Register your first devotee using the form.",
  },
  "admin.selectDevoteeFirst": { hi: "पहले भक्त चुनें", en: "Select a devotee first" },
  "admin.sankalpAssigned": { hi: "संकल्प दे दिया गया", en: "Sankalp assigned" },
  "admin.assignFailed": { hi: "संकल्प नहीं दिया जा सका", en: "Could not assign sankalp" },
  "admin.assigning": { hi: "दिया जा रहा है…", en: "Assigning…" },
  "admin.assignTarget": { hi: "लक्ष्य दें", en: "Assign Target" },
  "admin.exportNothing": {
    hi: "इस फ़िल्टर में निर्यात करने योग्य कुछ नहीं",
    en: "Nothing to export for this filter",
  },
  "admin.reportLoadFailed": { hi: "रिपोर्ट नहीं मिल सकी", en: "Could not load report" },
  "admin.exported": { hi: "{count} भक्त निर्यात हुए", en: "Exported {count} devotees" },
  "admin.village": { hi: "गाँव", en: "Village" },
  "admin.city": { hi: "शहर", en: "City" },
  "admin.tehsil": { hi: "तहसील", en: "Tehsil" },
  "admin.district": { hi: "ज़िला", en: "District" },

  // --- Generic -----------------------------------------------------------
  "common.loadFailed": { hi: "आपकी जानकारी नहीं मिल सकी", en: "Unable to load your details" },
  "common.tapCounterNote": { hi: "जप काउंटर", en: "Tap counter" },
} as const;

export type TranslationKey = keyof typeof STRINGS;

/**
 * Look up a string and fill `{placeholders}`. Falls back to the key itself so
 * a missing entry shows up loudly in the UI instead of rendering blank.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const entry = STRINGS[key];
  if (!entry) return key;

  let text: string = entry[language] ?? entry.en;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

type TranslationKey = keyof typeof translations.en;

const hindiText: Record<string, string> = {
  'Overview': 'अवलोकन', 'My Appointments': 'मेरी अपॉइंटमेंट', 'My Profile': 'मेरी प्रोफ़ाइल',
  'My Certificates': 'मेरे प्रमाणपत्र', 'Schedule Donation': 'दान शेड्यूल करें',
  'Welcome': 'स्वागत है', 'Track your donations and schedule your next contribution.': 'अपने दान को ट्रैक करें और अगला योगदान शेड्यूल करें।',
  'Blood Group': 'रक्त समूह', 'Total Donations': 'कुल दान', 'Upcoming': 'आगामी', 'Certificates': 'प्रमाणपत्र',
  'Upcoming Appointments': 'आगामी अपॉइंटमेंट', 'No upcoming appointments': 'कोई आगामी अपॉइंटमेंट नहीं', 'Schedule a donation to get started.': 'शुरू करने के लिए दान शेड्यूल करें।',
  'Recent Certificates': 'हाल के प्रमाणपत्र', 'No certificates yet': 'अभी कोई प्रमाणपत्र नहीं', 'Complete a donation to earn your first certificate.': 'पहला प्रमाणपत्र पाने के लिए दान पूरा करें।',
  'Earned': 'प्राप्त', 'Manage your scheduled and past donations.': 'अपने निर्धारित और पिछले दानों का प्रबंधन करें।', 'No appointments yet': 'अभी कोई अपॉइंटमेंट नहीं',
  'Schedule your first blood donation appointment.': 'अपनी पहली रक्तदान अपॉइंटमेंट शेड्यूल करें।', 'Download your donation certificates.': 'अपने दान प्रमाणपत्र डाउनलोड करें।',
  'Certificate of Donation': 'रक्तदान प्रमाणपत्र', 'Certificate No.': 'प्रमाणपत्र संख्या', 'Hospital': 'अस्पताल', 'Date': 'तारीख', 'Units': 'इकाइयां', 'Download': 'डाउनलोड',
  'Schedule Blood Donation': 'रक्तदान शेड्यूल करें', 'No hospitals are registered yet.': 'अभी कोई अस्पताल पंजीकृत नहीं है।', 'Select Hospital': 'अस्पताल चुनें', 'Choose a hospital': 'अस्पताल चुनें',
  'Notes (optional)': 'नोट्स (वैकल्पिक)', 'Any health notes for the hospital': 'अस्पताल के लिए कोई स्वास्थ्य संबंधी नोट', 'Cancel': 'रद्द करें', 'Schedule': 'शेड्यूल करें',
  'Manage your personal information.': 'अपनी व्यक्तिगत जानकारी प्रबंधित करें।', 'Full Name': 'पूरा नाम', 'City': 'शहर', 'Address': 'पता', 'Save Changes': 'बदलाव सहेजें', 'Saved successfully!': 'सफलतापूर्वक सहेजा गया!',
  'Verified Donor': 'सत्यापित दाता', 'Pending Verification': 'सत्यापन लंबित', 'Hospital Admin': 'अस्पताल प्रशासक', 'Hospital Settings': 'अस्पताल सेटिंग्स',
  'Monitor your blood inventory and donor appointments.': 'अपने रक्त भंडार और दाता अपॉइंटमेंट की निगरानी करें।', 'Emergency Request': 'आपातकालीन अनुरोध',
  'Total Blood Units': 'कुल रक्त इकाइयां', 'Incoming Donors': 'आने वाले दाता', 'Completed Donations': 'पूर्ण दान', 'Active Emergencies': 'सक्रिय आपात स्थिति',
  'Blood Inventory Summary': 'रक्त भंडार सारांश', 'units': 'इकाइयां', 'No upcoming donors': 'कोई आगामी दाता नहीं', 'No scheduled appointments.': 'कोई निर्धारित अपॉइंटमेंट नहीं।',
  'View and manage scheduled blood donation appointments.': 'निर्धारित रक्तदान अपॉइंटमेंट देखें और प्रबंधित करें।', 'No appointments': 'कोई अपॉइंटमेंट नहीं', 'No donors have scheduled appointments yet.': 'किसी दाता ने अभी अपॉइंटमेंट शेड्यूल नहीं की है।',
  "Manage your hospital's blood stock across all types.": 'सभी रक्त समूहों के लिए अपने अस्पताल के रक्त भंडार का प्रबंधन करें।', 'Create and track emergency blood requests. Call multiple hospitals simultaneously.': 'आपातकालीन रक्त अनुरोध बनाएं और ट्रैक करें। कई अस्पतालों को एक साथ कॉल करें।',
  'New Emergency Request': 'नया आपातकालीन अनुरोध', 'No emergency requests': 'कोई आपातकालीन अनुरोध नहीं', 'Create an emergency request when you urgently need blood.': 'जब आपको तुरंत रक्त चाहिए तो आपातकालीन अनुरोध बनाएं।',
  'Register your hospital': 'अपना अस्पताल पंजीकृत करें', 'Set up your hospital profile before managing donors, inventory, and emergency requests.': 'दाता, भंडार और आपातकालीन अनुरोध प्रबंधित करने से पहले अस्पताल प्रोफ़ाइल सेट करें।',
  'Your hospital will remain pending until an administrator approves it.': 'प्रशासक की मंज़ूरी मिलने तक आपका अस्पताल लंबित रहेगा।', 'Register Hospital': 'अस्पताल पंजीकृत करें', 'Low Stock': 'कम भंडार', 'units available': 'उपलब्ध इकाइयां', 'Saving...': 'सहेजा जा रहा है...',
  'Create Emergency Request': 'आपातकालीन अनुरोध बनाएं', 'This will call all selected hospitals simultaneously via Twilio.': 'यह Twilio के माध्यम से सभी चुने गए अस्पतालों को एक साथ कॉल करेगा।', 'Automated Emergency Dispatch': 'स्वचालित आपातकालीन प्रेषण', 'This will call all selected hospitals simultaneously.': 'यह सभी चुने गए अस्पतालों को एक साथ कॉल करेगा।', 'Blood Group Needed': 'आवश्यक रक्त समूह', 'Units Needed': 'आवश्यक इकाइयां', 'Urgency Level': 'तात्कालिकता स्तर',
  'Critical — Life threatening': 'गंभीर — जीवन के लिए खतरा', 'Urgent — Needed within hours': 'तत्काल — कुछ घंटों में आवश्यक', 'Moderate — Needed within days': 'मध्यम — कुछ दिनों में आवश्यक', 'Select Hospitals to Call': 'कॉल करने के लिए अस्पताल चुनें', 'No other approved hospitals available.': 'कोई अन्य स्वीकृत अस्पताल उपलब्ध नहीं है।',
  'Close Request': 'अनुरोध बंद करें', 'Hospital Calls': 'अस्पताल कॉल', 'No calls made yet.': 'अभी कोई कॉल नहीं की गई।', 'Admin Dashboard': 'प्रशासक डैशबोर्ड', 'Platform-wide overview of all activity.': 'पूरी प्रणाली की गतिविधियों का अवलोकन।',
  'Total Donors': 'कुल दाता', 'Hospitals': 'अस्पताल', 'Total Appointments': 'कुल अपॉइंटमेंट', 'Pending Verifications': 'लंबित सत्यापन', 'All donors verified': 'सभी दाता सत्यापित हैं', 'No pending verifications.': 'कोई लंबित सत्यापन नहीं।',
  'Verify': 'सत्यापित करें', 'Pending Hospital Approvals': 'लंबित अस्पताल स्वीकृतियां', 'All hospitals approved': 'सभी अस्पताल स्वीकृत हैं', 'No pending approvals.': 'कोई लंबित स्वीकृति नहीं।', 'Approve': 'स्वीकृत करें', 'All Donors': 'सभी दाता', 'View and verify all registered donors.': 'सभी पंजीकृत दाताओं को देखें और सत्यापित करें।', 'Search by name, email, or blood group...': 'नाम, ईमेल या रक्त समूह से खोजें...',
  'All Hospitals': 'सभी अस्पताल', 'View and manage all registered hospitals.': 'सभी पंजीकृत अस्पतालों को देखें और प्रबंधित करें।', 'Approved': 'स्वीकृत', 'Revoke': 'रद्द करें', 'All Appointments': 'सभी अपॉइंटमेंट', 'Every appointment across the platform.': 'पूरी प्रणाली की सभी अपॉइंटमेंट।', 'No appointments have been scheduled.': 'कोई अपॉइंटमेंट शेड्यूल नहीं की गई।',
  'All Certificates': 'सभी प्रमाणपत्र', 'Every certificate issued across the platform.': 'पूरी प्रणाली में जारी सभी प्रमाणपत्र।', 'No certificates': 'कोई प्रमाणपत्र नहीं', 'No certificates have been issued yet.': 'अभी कोई प्रमाणपत्र जारी नहीं किया गया।', 'Emergency Requests': 'आपातकालीन अनुरोध', 'All emergency blood requests across the platform.': 'पूरी प्रणाली के सभी आपातकालीन रक्त अनुरोध।', 'No emergencies': 'कोई आपात स्थिति नहीं', 'No emergency requests have been created.': 'कोई आपातकालीन अनुरोध नहीं बनाया गया।', 'No donors found': 'कोई दाता नहीं मिला', 'No donors match your search.': 'आपकी खोज से कोई दाता मेल नहीं खाता।',
  'Name': 'नाम', 'Email': 'ईमेल', 'Status': 'स्थिति', 'Action': 'कार्रवाई', 'Unknown': 'अज्ञात', 'Unknown Donor': 'अज्ञात दाता', 'Unknown hospital': 'अज्ञात अस्पताल', 'Donor notes:': 'दाता के नोट्स:', 'Mark Donated': 'दान पूर्ण करें',
  'Upcoming Donors': 'आगामी दाता', 'Hospital Name': 'अस्पताल का नाम', 'Notes': 'नोट्स', 'Select': 'चुनें', 'Additional details for hospitals': 'अस्पतालों के लिए अतिरिक्त जानकारी', 'hospital(s) selected': 'अस्पताल चुने गए', 'Create & Call Hospitals': 'बनाएं और अस्पतालों को कॉल करें', 'Complete all hospital details before registering.': 'पंजीकरण से पहले अस्पताल की सभी जानकारी भरें।', 'Hospital registration failed.': 'अस्पताल पंजीकरण विफल रहा।', 'Hospital created, but inventory setup failed:': 'अस्पताल बनाया गया, लेकिन भंडार सेटअप विफल रहा:', 'Please select a blood group.': 'कृपया रक्त समूह चुनें।', 'Select at least one hospital to call.': 'कॉल करने के लिए कम से कम एक अस्पताल चुनें।', 'Call initiation failed. Check Twilio configuration and phone numbers.': 'कॉल शुरू नहीं हो सकी। Twilio कॉन्फ़िगरेशन और फ़ोन नंबर जांचें।', 'Call initiation failed. Check telephony configuration and phone numbers.': 'कॉल शुरू नहीं हो सकी। टेलीफ़ोनी कॉन्फ़िगरेशन और फ़ोन नंबर जांचें।', 'Phone number for emergency calls': 'आपातकालीन कॉल के लिए फ़ोन नंबर', 'Manage your hospital\'s information.': 'अपने अस्पताल की जानकारी प्रबंधित करें。', 'Emergencies': 'आपात स्थिति', 'Hospital Approval failed:': 'अस्पताल स्वीकृति विफल:', 'Hospital approval failed: no hospital was updated. Apply the latest Supabase migration and make sure this account has the admin role.': 'अस्पताल स्वीकृति विफल: कोई अस्पताल अपडेट नहीं हुआ। नवीनतम Supabase माइग्रेशन लागू करें और सुनिश्चित करें कि इस खाते की प्रशासक भूमिका है।',
  'scheduled': 'निर्धारित', 'completed': 'पूर्ण', 'cancelled': 'रद्द', 'active': 'सक्रिय', 'fulfilled': 'पूरा हुआ', 'closed': 'बंद', 'critical': 'गंभीर', 'urgent': 'तत्काल', 'moderate': 'मध्यम', 'answered': 'उत्तर दिया गया', 'calling': 'कॉल हो रही है', 'failed': 'विफल', 'pending': 'लंबित', 'initiated': 'شुरू', 'ringing': 'घंटी बज रही है', 'no_answer': 'उत्तर नहीं मिला',
};

const translations = {
  en: {
    language: 'Language',
    english: 'English',
    hindi: 'Hindi',
    signIn: 'Sign In',
    signUp: 'Sign up',
    signOut: 'Sign out',
    continueWithGoogle: 'Continue with Google',
    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    email: 'Email',
    password: 'Password',
    phone: 'Phone',
    city: 'City',
    address: 'Address',
    fullName: 'Full Name',
    hospitalName: 'Hospital name',
    donor: 'Donor',
    hospital: 'Hospital',
    administrator: 'Administrator',
    overview: 'Overview',
    incomingDonors: 'Incoming Donors',
    bloodInventory: 'Blood Inventory',
    emergencyRequests: 'Emergency Requests',
    settings: 'Settings',
    donors: 'Donors',
    appointments: 'Appointments',
    certificates: 'Certificates',
    allHospitals: 'All Hospitals',
    adminDashboard: 'Admin Dashboard',
    donorDashboard: 'Donor Dashboard',
    hospitalDashboard: 'Hospital Dashboard',
    bloodGroup: 'Blood Group',
    totalDonations: 'Total Donations',
    upcoming: 'Upcoming',
    totalBloodUnits: 'Total Blood Units',
    activeEmergencies: 'Active Emergencies',
    completedDonations: 'Completed Donations',
    noAppointments: 'No appointments',
    noCertificates: 'No certificates yet',
    noUpcomingDonors: 'No upcoming donors',
    noEmergencyRequests: 'No emergency requests',
    search: 'Search',
    emergencyRequest: 'Emergency Request',
    newEmergencyRequest: 'New Emergency Request',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    agreeTerms: 'I agree to the Terms and Conditions and Privacy Policy.',
    termsAndConditions: 'Terms and Conditions',
    privacyPolicy: 'Privacy Policy',
    viewPolicy: 'View policy',
    hidePolicy: 'Hide policy',
    termsRequired: 'Please agree to the Terms and Conditions before creating an account.',
    policyText: 'By creating an account, you agree to use BloodFlow responsibly, provide accurate information, and allow the platform to process your account and donation details for blood donation coordination. You can request account deletion through the platform administrator.',
  },
  hi: {
    language: 'भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    signIn: 'साइन इन',
    signUp: 'साइन अप',
    signOut: 'साइन आउट',
    continueWithGoogle: 'Google के साथ जारी रखें',
    welcomeBack: 'वापसी पर स्वागत है',
    createAccount: 'अपना खाता बनाएं',
    email: 'ईमेल',
    password: 'पासवर्ड',
    phone: 'फ़ोन',
    city: 'शहर',
    address: 'पता',
    fullName: 'पूरा नाम',
    hospitalName: 'अस्पताल का नाम',
    donor: 'दाता',
    hospital: 'अस्पताल',
    administrator: 'प्रशासक',
    overview: 'अवलोकन',
    incomingDonors: 'आने वाले दाता',
    bloodInventory: 'रक्त भंडार',
    emergencyRequests: 'आपातकालीन अनुरोध',
    settings: 'सेटिंग्स',
    donors: 'दाता',
    appointments: 'अपॉइंटमेंट',
    certificates: 'प्रमाणपत्र',
    allHospitals: 'सभी अस्पताल',
    adminDashboard: 'प्रशासक डैशबोर्ड',
    donorDashboard: 'दाता डैशबोर्ड',
    hospitalDashboard: 'अस्पताल डैशबोर्ड',
    bloodGroup: 'रक्त समूह',
    totalDonations: 'कुल दान',
    upcoming: 'आगामी',
    totalBloodUnits: 'कुल रक्त इकाइयां',
    activeEmergencies: 'सक्रिय आपात स्थिति',
    completedDonations: 'पूर्ण दान',
    noAppointments: 'कोई अपॉइंटमेंट नहीं',
    noCertificates: 'अभी कोई प्रमाणपत्र नहीं',
    noUpcomingDonors: 'कोई आगामी दाता नहीं',
    noEmergencyRequests: 'कोई आपातकालीन अनुरोध नहीं',
    search: 'खोजें',
    emergencyRequest: 'आपातकालीन अनुरोध',
    newEmergencyRequest: 'नया आपातकालीन अनुरोध',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    loading: 'लोड हो रहा है...',
    agreeTerms: 'मैं नियम और शर्तों तथा गोपनीयता नीति से सहमत हूं।',
    termsAndConditions: 'नियम और शर्तें',
    privacyPolicy: 'गोपनीयता नीति',
    viewPolicy: 'नीति देखें',
    hidePolicy: 'नीति छिपाएं',
    termsRequired: 'खाता बनाने से पहले नियम और शर्तों से सहमत हों।',
    policyText: 'खाता बनाकर आप BloodFlow का जिम्मेदारी से उपयोग करने, सही जानकारी देने और रक्तदान समन्वय के लिए अपनी खाता व दान संबंधी जानकारी संसाधित करने की सहमति देते हैं। खाता हटाने के लिए प्लेटफ़ॉर्म प्रशासक से अनुरोध करें।',
  },
} satisfies Record<Language, Record<string, string>>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  tr: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = window.localStorage.getItem('bloodflow-language');
    return stored === 'hi' ? 'hi' : 'en';
  });

  useEffect(() => {
    window.localStorage.setItem('bloodflow-language', language);
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
  }

  function t(key: TranslationKey) {
    return translations[language][key];
  }

  function tr(text: string) {
    return language === 'hi' ? hindiText[text] || text : text;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t, tr }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export type { TranslationKey };

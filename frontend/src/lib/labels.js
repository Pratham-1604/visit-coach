// What the teacher reads, in their language: the shared page (TeacherView) and the WhatsApp message (share.js).
// Drafts: to be checked by native speakers (DECISIONS.md #13).
// In Maharashtra the mentor is the Kendra Pramukh (केंद्रप्रमुख), the title teachers already know.
export const TEACHER_LABELS = {
  en: {
    title: 'Notes from your class visit',
    strength: 'What went well',
    priority: 'One thing to work on',
    practice_steps: '5-minute practice for tomorrow',
    materials: 'Materials',
    follow_up: 'What we agreed before the next visit',
    follow_up_check: 'How we will look at it next time',
    mentor: 'Mentor',
    history: 'Your coaching so far',
    history_empty: 'This was your first visit with VisitCoach.',
    results: { done: 'Done', partly: 'Partly done', not_done: 'Not done yet', open: 'To look at next visit' },
    details: 'Full notes and the 5-minute practice',
    error: 'This link does not work. Please ask your mentor to share it again.',
  },
  hi: {
    title: 'आपकी कक्षा की मुलाक़ात के नोट्स',
    strength: 'क्या अच्छा रहा',
    priority: 'एक चीज़ जिस पर काम करें',
    practice_steps: 'कल के लिए 5 मिनट का अभ्यास',
    materials: 'सामग्री',
    follow_up: 'अगली मुलाक़ात तक हमने क्या तय किया',
    follow_up_check: 'अगली बार हम इसे कैसे देखेंगे',
    mentor: 'मार्गदर्शक',
    history: 'अब तक का मार्गदर्शन',
    history_empty: 'VisitCoach के साथ यह आपकी पहली मुलाक़ात थी।',
    results: { done: 'हो गया', partly: 'कुछ हद तक हुआ', not_done: 'अभी नहीं हुआ', open: 'अगली मुलाक़ात में देखेंगे' },
    details: 'पूरे नोट्स और 5 मिनट का अभ्यास',
    error: 'यह लिंक काम नहीं कर रहा। कृपया अपने मार्गदर्शक से इसे दोबारा भेजने को कहें।',
  },
  mr: {
    title: 'तुमच्या वर्ग भेटीच्या नोंदी',
    strength: 'काय छान झाले',
    priority: 'लक्ष देण्यासारखी एक गोष्ट',
    practice_steps: 'उद्यासाठी ५ मिनिटांचा सराव',
    materials: 'साहित्य',
    follow_up: 'पुढच्या भेटीपर्यंत आपण काय ठरवले',
    follow_up_check: 'पुढच्या वेळी आपण हे कसे पाहू',
    mentor: 'केंद्रप्रमुख',
    history: 'आतापर्यंतचे मार्गदर्शन',
    history_empty: 'VisitCoach सोबत ही तुमची पहिली भेट होती.',
    results: { done: 'झाले', partly: 'काही प्रमाणात झाले', not_done: 'अजून झाले नाही', open: 'पुढच्या भेटीत पाहू' },
    details: 'सविस्तर नोंदी आणि ५ मिनिटांचा सराव',
    error: 'ही लिंक चालत नाही. कृपया तुमच्या केंद्रप्रमुखांना ती पुन्हा पाठवायला सांगा.',
  },
  ta: {
    title: 'உங்கள் வகுப்பு வருகைக் குறிப்புகள்',
    strength: 'நன்றாக நடந்தது',
    priority: 'கவனம் செலுத்த வேண்டிய ஒன்று',
    practice_steps: 'நாளைக்கான 5 நிமிடப் பயிற்சி',
    materials: 'தேவையான பொருட்கள்',
    follow_up: 'அடுத்த வருகை வரை நாம் ஒப்புக்கொண்டது',
    follow_up_check: 'அடுத்த முறை இதை எப்படிப் பார்ப்போம்',
    mentor: 'வழிகாட்டி',
    history: 'இதுவரை பெற்ற வழிகாட்டல்',
    history_empty: 'VisitCoach உடன் இது உங்கள் முதல் வருகை.',
    results: { done: 'முடிந்தது', partly: 'ஓரளவு முடிந்தது', not_done: 'இன்னும் இல்லை', open: 'அடுத்த வருகையில் பார்ப்போம்' },
    details: 'முழுக் குறிப்புகளும் 5 நிமிடப் பயிற்சியும்',
    error: 'இந்த இணைப்பு வேலை செய்யவில்லை. உங்கள் வழிகாட்டியிடம் மீண்டும் அனுப்பச் சொல்லுங்கள்.',
  },
}

export function teacherLabels(language) {
  return TEACHER_LABELS[language] ?? TEACHER_LABELS.en
}

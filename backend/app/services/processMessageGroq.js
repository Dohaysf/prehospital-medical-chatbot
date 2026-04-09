// backend/app/services/processMessageGroq.js
console.log('✅ processMessageGroq.js chargé');
const { callGroq } = require('./groqService');
const { extractInfo, evaluateSeverity } = require('./nlpService');
const axios = require('axios');

// Détection de la langue (français ou arabe)
function detectLanguage(text) {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'fr';
}

// Détermine le premier champ manquant
function getMissingField(summary) {
  if (!summary.symptom) return 'symptom';
  if (!summary.bodyPart) return 'bodyPart';
  if (!summary.duration) return 'duration';
  if (summary.intensity === undefined || summary.intensity === null) return 'intensity';
  if (!summary.age) return 'age';
  if (!summary.patientLocation) return 'patientLocation';
  return null;
}

// Construit le prompt en fonction de la langue et du contexte médical
function buildPrompt(userMessage, summary, missingField, lang) {
  const symptom = summary.symptom;
  const bodyPart = summary.bodyPart;
  const isArabic = lang === 'ar';
  
  let instruction = '';
  let conseil = '';

  // Instructions selon le champ manquant (français/arabe)
  const instructionsFr = {
    symptom: "Demandez au patient quel est son problème principal (symptôme). Soyez concis et professionnel.",
    bodyPart: "Demandez au patient quelle partie du corps est concernée. Soyez précis." + (symptom === 'douleur' ? " Si c'est une douleur, demandez si elle est localisée ou irradiante." : ""),
    duration: "Demandez depuis combien de temps les symptômes sont présents (heures, jours).",
    intensity: "Demandez au patient d'évaluer l'intensité de ses symptômes sur une échelle de 1 à 10 (1 = très léger, 10 = insupportable).",
    age: "Demandez l'âge du patient.",
    patientLocation: "Demandez l'adresse précise ou le lieu où se trouve le patient (rue, ville, code postal)."
  };
  const instructionsAr = {
    symptom: "اسأل المريض عن مشكلته الرئيسية (الأعراض). كن موجزًا ومهنيًا.",
    bodyPart: "اسأل المريض عن أي جزء من الجسم معني. كن دقيقًا." + (symptom === 'douleur' ? " إذا كان ألمًا، اسأل إذا كان موضعيًا أو منتشرًا." : ""),
    duration: "اسأل منذ متى ظهرت الأعراض (ساعات، أيام).",
    intensity: "اطلب من المريض تقييم شدة أعراضه على مقياس من 1 إلى 10 (1 = خفيف جدًا، 10 = لا يطاق).",
    age: "اسأل عن عمر المريض.",
    patientLocation: "اسأل عن العنوان الدقيق أو المكان الذي يتواجد فيه المريض (شارع، مدينة، رمز بريدي)."
  };

  instruction = isArabic ? instructionsAr[missingField] : instructionsFr[missingField];

  // Conseils de premiers secours pour cas critiques
  const conseilsFr = {
    poitrine: " IMPORTANT : Si le patient a une douleur thoracique, conseillez-lui de ne pas bouger, de s'asseoir ou s'allonger, et d'appeler immédiatement les secours (15). Ajoutez cette consigne avant la question.",
    dyspnée: " Pour une difficulté respiratoire, conseillez au patient de rester calme, de s'asseoir et de respirer lentement. Si cela empire, appelez les secours.",
    saignement: " En cas de saignement, conseillez d'appliquer une compression directe sur la plaie avec un linge propre."
  };
  const conseilsAr = {
    poitrine: " مهم: إذا كان المريض يعاني من ألم في الصدر، انصحه بعدم الحركة، والجلوس أو الاستلقاء، والاتصال الفوري بالإسعاف (15). أضف هذه النصيحة قبل السؤال.",
    dyspnée: " لصعوبة التنفس، انصح المريض بالهدوء والجلوس والتنفس ببطء. إذا تفاقمت الحالة، اتصل بالإسعاف.",
    saignement: " في حالة النزيف، انصح بوضع ضغط مباشر على الجرح بقطعة قماش نظيفة."
  };

  if (symptom === 'douleur' && bodyPart === 'poitrine') {
    conseil = isArabic ? conseilsAr.poitrine : conseilsFr.poitrine;
    instruction += conseil;
  } else if (symptom === 'dyspnée') {
    conseil = isArabic ? conseilsAr.dyspnée : conseilsFr.dyspnée;
    instruction += conseil;
  } else if (symptom === 'saignement') {
    conseil = isArabic ? conseilsAr.saignement : conseilsFr.saignement;
    instruction += conseil;
  }

  const prompt = isArabic 
    ? `أنت مساعد طبي ما قبل المستشفى. 
المعلومات التي تم جمعها حتى الآن: ${JSON.stringify(summary)}.
قال المريض: "${userMessage}".
${instruction}
اطرح سؤالاً واحداً باللغة العربية للحصول على المعلومات المفقودة. إذا تم تقديم نصيحة إسعافات أولية، أدرجها في نفس الجملة أو قبلها. لا تطرح سؤالاً آخر. كن متعاطفًا ومطمئنًا.`
    : `Tu es un assistant médical pré-hospitalier expérimenté. 
Informations déjà collectées : ${JSON.stringify(summary)}.
Le patient a dit : "${userMessage}".
${instruction}
Pose UNE SEULE question en français pour obtenir l'information manquante. Si un conseil de premiers secours est indiqué, inclus-le dans la même phrase ou juste avant. Ne pose pas d'autre question. Sois empathique et rassurant.`;

  return prompt;
}

async function sendToPFA(esoSummary, sessionId) {
  const PFA_API_URL = 'http://localhost:3000/api/chatbot/emergency';
  try {
    const response = await axios.post(PFA_API_URL, { esoSummary, sessionId });
    console.log('✅ Données envoyées au PFA :', response.data);
  } catch (error) {
    console.error('❌ Erreur lors de l’envoi au PFA :', error.message);
  }
}

async function processMessageGroq(userMessage, currentSummary = {}, sessionId = null) {
  // 1. Extraction par règles (supporte français et darija)
  const extractedInfo = extractInfo(userMessage, currentSummary);
  const updatedSummary = { ...currentSummary, ...extractedInfo };
  const severity = evaluateSeverity(updatedSummary);

  // 2. Détection de la langue du message utilisateur
  const lang = detectLanguage(userMessage);

  // 3. Champ manquant
  const missingField = getMissingField(updatedSummary);

  let reply;
  if (missingField) {
    const prompt = buildPrompt(userMessage, updatedSummary, missingField, lang);
    const groqReply = await callGroq(prompt);
    const firstQuestion = groqReply.split('?')[0] + '?';
    reply = firstQuestion;
  } else {
    // Message de fin dans la langue de l'utilisateur
    if (lang === 'ar') {
      reply = "شكرًا لك. تم تسجيل جميع المعلومات. تم إبلاغ خدمات الطوارئ إذا لزم الأمر.";
    } else {
      reply = "Merci. Toutes les informations sont enregistrées. Les secours ont été alertés si nécessaire.";
    }
    if (sessionId) {
      await sendToPFA(updatedSummary, sessionId);
    }
  }

  return {
    reply,
    extractedInfo: { ...extractedInfo, severity },
    intent: 'groq'
  };
}

module.exports = { processMessageGroq };
export const messages = {
  en: {
    // Auth messages
    loginSuccess: "Login successfully.",
    loginFailed: "Invalid credentials",
    accessDenied: "Access denied. Admin privileges required.",
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    tokenExpired: "Invalid or expired token",

    // User messages
    userExists: "User already exists",
    userCreated: "User registered successfully",
    userNotFound: "User not found",

    // General messages
    success: "Operation completed successfully",
    error: "Internal server error",
    invalidInput: "Invalid input provided",
    requiredField: "This field is required",

    // Validation messages
    emailRequired: "Email is required",
    emailInvalid: "Please provide a valid email address",
    credentialRequired: "Password is required",
    credentialMin: "Password must be at least 6 characters long",
  },
  hi: {
    // Auth messages
    loginSuccess: "सफलतापूर्वक लॉगिन हुआ।",
    loginFailed: "अमान्य प्रमाण",
    accessDenied: "पहुंच अस्वीकृत। प्रशासकीय अधिकारों की आवश्यकता है।",
    unauthorized: "अनधिकृत",
    forbidden: "प्रतिबंधित",
    tokenExpired: "अमान्य या समाप्त टोकन",

    // User messages
    userExists: "उपयोगकर्ता पहले से मौजूद है",
    userCreated: "उपयोगकर्ता सफलतापूर्वक पंजीकृत हुआ",
    userNotFound: "उपयोगकर्ता नहीं मिला",

    // General messages
    success: "सफलतापूर्वक ऑपरेशन पूरा हुआ",
    error: "आंतरिक सर्वर त्रुटि",
    invalidInput: "अमान्य इनपुट प्रदान किया गया",
    requiredField: "यह फ़ील्ड आवश्यक है",

    // Validation messages
    emailRequired: "ईमेल आवश्यक है",
    emailInvalid: "कृपया एक वैध ईमेल पता प्रदान करें",
    credentialRequired: "पासवर्ड आवश्यक है",
    credentialMin: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
  },
  ar: {
    // Auth messages
    loginSuccess: "تم تسجيل الدخول بنجاح.",
    loginFailed: "بيانات الاعتماد غير صالحة",
    accessDenied: "تم رفض الوصول. مطلوب امتيازات المسؤول.",
    unauthorized: "غير مصرح",
    forbidden: "محظور",
    tokenExpired: "رمز غير صالح أو منتهي الصلاحية",

    // User messages
    userExists: "المستخدم موجود بالفعل",
    userCreated: "تم تسجيل المستخدم بنجاح",
    userNotFound: "المستخدم غير موجود",

    // General messages
    success: "تمت العملية بنجاح",
    error: "خطأ داخلي في الخادم",
    invalidInput: "إدخال غير صالح",
    requiredField: "هذا الحقل مطلوب",

    // Validation messages
    emailRequired: "البريد الإلكتروني مطلوب",
    emailInvalid: "يرجى تقديم عنوان بريد إلكتروني صالح",
    credentialRequired: "كلمة المرور مطلوبة",
    credentialMin: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل",
  },
};

export const getMessage = (
  key: keyof typeof messages.en,
  lang: "en" | "ar" | "hi" = "en",
): string => {
  return messages[lang][key] || messages.en[key];
};

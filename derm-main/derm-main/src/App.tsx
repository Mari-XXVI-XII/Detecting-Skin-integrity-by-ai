import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Activity, 
  Clock, 
  RefreshCcw, 
  ShieldAlert,
  CheckCircle2,
  Info,
  Sun,
  Moon,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/utils";

type ServerStatus = "Offline" | "Starting" | "Online";
type SupportedLang = "ar" | "en";

const BODY_SITES = [
  "abdomen", "back", "chest", "ear", "face", "foot", "genital", 
  "hand", "lower extremity", "neck", "scalp", "trunk", "upper extremity", "unknown"
];

const SEVERITY_COLORS: Record<string, string> = {
  "Melanocytic Nevi (benign mole)": "bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 shadow-none border-blue-500/20",
  "Melanoma (malignant)": "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 shadow-none border-red-500/20",
  "Benign Keratosis": "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 shadow-none border-green-500/20",
  "Basal Cell Carcinoma": "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 shadow-none border-orange-500/20",
  "Actinic Keratoses / Intraepithelial Carcinoma": "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 shadow-none border-orange-500/20",
  "Vascular Lesion": "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20 shadow-none border-purple-500/20",
  "Dermatofibroma": "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-500/20 shadow-none border-zinc-500/20",
};

const TRANSLATIONS = {
  en: {
    title: "Dermalyze",
    subtitle: "Professional Dermoscopy Skin Lesion Classifier",
    serverStatus: "Server Status",
    hfEndpointSubtitle: {
      Offline: "Endpoint is offline",
      Starting: "Endpoint is starting up...",
      Online: "AI Analysis Server",
    },
    wakingServer: "Waking server...",
    systemReady: "System is online and ready for analysis.",
    endpointIdle: "Endpoint automatically shuts down after 15 minutes of inactivity. Wake it up to begin.",
    wakeServer: "Wake Server",
    onlineToast: "Server is now Online!",
    timeoutToast: "Server wake timeout. Please try again.",
    caseInfo: "Case Information",
    uploadDesc: "Upload dermoscopy image and patient metadata",
    fileTooLarge: "File is too large. Max 10MB.",
    clickOrDrag: "Click or drag image here",
    fileTypes: "JPEG, PNG, or WebP up to 10MB",
    changeImage: "Change Image",
    optionalMetadata: "Optional Patient Metadata",
    age: "Age",
    agePlaceholder: "Years",
    sex: "Sex",
    sexPlaceholder: "Select Sex",
    male: "Male",
    female: "Female",
    other: "Other",
    localization: "Localization",
    locPlaceholder: "Select Body Site",
    analyzing: "Analyzing Data...",
    analyzeLesion: "Analyze Lesion",
    analysisComplete: "Analysis Complete",
    aiClassification: "AI-generated clinical classification",
    diagnosis: "Diagnosis",
    malignant: "Malignant / High Concern",
    benign: "Likely Benign",
    medicalDisclaimer: "Medical Disclaimer",
    disclaimerText: "This tool is an AI assistant for research purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.",
    analyzeAnother: "Analyze Another Case",
    analysisFailed: "Analysis failed",
    errorDetails: "Error Details",
    statusLabels: {
      Offline: "Offline",
      Starting: "Starting",
      Online: "Online"
    },
    bodySites: {
      abdomen: "Abdomen", back: "Back", chest: "Chest", ear: "Ear", face: "Face", foot: "Foot", genital: "Genital", 
      hand: "Hand", "lower extremity": "Lower extremity", neck: "Neck", scalp: "Scalp", trunk: "Trunk", "upper extremity": "Upper extremity", unknown: "Unknown"
    },
    labels: {
      "Melanocytic Nevi (benign mole)": "Melanocytic Nevi (benign mole)",
      "Melanoma (malignant)": "Melanoma (malignant)",
      "Benign Keratosis": "Benign Keratosis",
      "Basal Cell Carcinoma": "Basal Cell Carcinoma",
      "Actinic Keratoses / Intraepithelial Carcinoma": "Actinic Keratoses / Intraepithelial Carcinoma",
      "Vascular Lesion": "Vascular Lesion",
      "Dermatofibroma": "Dermatofibroma"
    }
  },
  ar: {
    title: "Dermalyze",
    subtitle: "التصنيف الاحترافي لآفات الجلد بالتنظير",
    serverStatus: "حالة الخادم",
    hfEndpointSubtitle: {
      Offline: "نقطة النهاية غير متصلة",
      Starting: "جاري تشغيل نقطة النهاية...",
      Online: "خادم تحليل الذكاء الاصطناعي",
    },
    wakingServer: "جاري إيقاظ الخادم...",
    systemReady: "",
    endpointIdle: "تتوقف نقطة النهاية تلقائيًا بعد 15 دقيقة من عدم النشاط. قم بتشغيلها للبدء.",
    wakeServer: "تشغيل الخادم",
    onlineToast: "الخادم متصل الآن!",
    timeoutToast: "انتهت مهلة تشغيل الخادم. يرجى المحاولة مرة أخرى.",
    caseInfo: "معلومات الحالة",
    uploadDesc: "قم بتحميل صورة تنظير الجلد وبيانات المريض",
    fileTooLarge: "حجم الملف كبير جدًا. الحد الأقصى 10 ميغابايت.",
    clickOrDrag: "انقر أو اسحب الصورة هنا",
    fileTypes: "ملفات JPEG أو PNG أو WebP حتى 10 ميغابايت",
    changeImage: "تغيير الصورة",
    optionalMetadata: "بيانات المريض الاختيارية",
    age: "العمر",
    agePlaceholder: "سنوات",
    sex: "الجنس",
    sexPlaceholder: "اختر الجنس",
    male: "ذكر",
    female: "أنثى",
    other: "أخرى",
    localization: "الموقع",
    locPlaceholder: "اختر موقع الجسم",
    analyzing: "جاري تحليل البيانات...",
    analyzeLesion: "تحليل الآفة",
    analysisComplete: "اكتمل التحليل",
    aiClassification: "تصنيف سريري مولد بالذكاء الاصطناعي",
    diagnosis: "التشخيص",
    malignant: "خبيث / مثير للقلق",
    benign: "على الأرجح حميد",
    medicalDisclaimer: "تنويه طبي",
    disclaimerText: "هذه الأداة هي مساعد ذكي لأغراض البحث فقط. وهي ليست بديلاً عن المشورة الطبية المتخصصة أو التشخيص أو العلاج. اطلب دائمًا مشورة طبيبك أو أي مقدم رعاية صحية مؤهل.",
    analyzeAnother: "تحليل حالة أخرى",
    analysisFailed: "فشل التحليل",
    errorDetails: "تفاصيل الخطأ",
    statusLabels: {
      Offline: "غير متصل",
      Starting: "جاري التشغيل",
      Online: "متصل"
    },
    bodySites: {
      abdomen: "البطن", back: "الظهر", chest: "الصدر", ear: "الأذن", face: "الوجه", foot: "القدم", genital: "الأعضاء التناسلية", 
      hand: "اليد", "lower extremity": "الطرف السفلي", neck: "الرقبة", scalp: "فروة الرأس", trunk: "الجذع", "upper extremity": "الطرف العلوي", unknown: "غير معروف"
    },
    labels: {
      "Melanocytic Nevi (benign mole)": "وحمة ميلانينية (شامة حميدة)",
      "Melanoma (malignant)": "ورم ميلانيني (خبيث)",
      "Benign Keratosis": "تقران حميد",
      "Basal Cell Carcinoma": "سرطان الخلايا القاعدية",
      "Actinic Keratoses / Intraepithelial Carcinoma": "التقران السعفي / سرطان داخل الظهارة",
      "Vascular Lesion": "آفة وعائية",
      "Dermatofibroma": "ورم ليفي جلدي"
    }
  }
};

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [lang, setLang] = useState<SupportedLang>(() => {
    const saved = localStorage.getItem("lang");
    return saved === "en" ? "en" : "ar";
  });
  const t = TRANSLATIONS[lang];

  const [status, setStatus] = useState<ServerStatus>("Offline");
  const [isWaking, setIsWaking] = useState(false);
  const [wakeProgress, setWakeProgress] = useState(0);
  const [wakeTimer, setWakeTimer] = useState(180);
  
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState({
    age: "",
    sex: "",
    localization: ""
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wakeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeCheckAbortRef = useRef<AbortController | null>(null);

  // Apply theme & languge direction
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    root.dir = lang === "ar" ? "rtl" : "ltr";
    root.lang = lang;
  }, [theme, lang]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  const toggleLang = () => {
    setLang(prev => {
      const next = prev === "ar" ? "en" : "ar";
      localStorage.setItem("lang", next);
      return next;
    });
  };

  useEffect(() => {
    checkHealth();

    // Periodically re-check server health so the status badge stays accurate
    // even if the server goes down after the initial load.
    const pollId = setInterval(() => checkHealth(), 60_000);

    return () => {
      clearInterval(pollId);
      if (wakeIntervalRef.current) {
        clearInterval(wakeIntervalRef.current);
      }
      wakeCheckAbortRef.current?.abort();
    };
  }, []);

  const checkHealth = async (silent = false, signal?: AbortSignal) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
      const res = await fetch("/api/health", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setStatus("Online");
        return true;
      } else {
        if (!silent) setStatus("Offline");
        return false;
      }
    } catch {
      clearTimeout(timeoutId);
      if (!silent) setStatus("Offline");
      return false;
    }
  };

  const handleWakeServer = async () => {
    // Guard against double-clicks while a pre-flight check is in progress or wake is running.
    if (isWaking) return;

    // If the server is already online, skip the wake-up flow entirely.
    const alreadyOnline = await checkHealth();
    if (alreadyOnline) {
      toast.success(t.onlineToast);
      return;
    }

    setIsWaking(true);
    setWakeProgress(0);
    setWakeTimer(180);
    setStatus("Starting");

    const startTime = Date.now();
    const duration = 180 * 1000;
    let isChecking = false;

    wakeIntervalRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      const remaining = Math.max(180 - Math.floor(elapsed / 1000), 0);
      
      setWakeProgress(progress);
      setWakeTimer(remaining);

      if (elapsed % 3000 < 1000 && !isChecking) {
        isChecking = true;
        const abortController = new AbortController();
        wakeCheckAbortRef.current = abortController;
        const isOnline = await checkHealth(true, abortController.signal);
        if (wakeCheckAbortRef.current === abortController) {
          wakeCheckAbortRef.current = null;
        }
        isChecking = false;
        if (isOnline) {
          clearInterval(wakeIntervalRef.current!);
          wakeIntervalRef.current = null;
          setIsWaking(false);
          toast.success(t.onlineToast);
        }
      }

      if (elapsed >= duration) {
        clearInterval(wakeIntervalRef.current!);
        wakeIntervalRef.current = null;
        wakeCheckAbortRef.current?.abort();
        wakeCheckAbortRef.current = null;
        setIsWaking(false);
        setStatus("Offline");
        toast.error(t.timeoutToast);
      }
    }, 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleUpload = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.fileTooLarge);
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setErrorDetails(null);
    
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("age", metadata.age);
      // For backend we keep English localization values
      formData.append("sex", metadata.sex);
      formData.append("localization", metadata.localization);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      if (!res.ok) {
        throw typeof data === "string" ? { error: data } : data;
      }

      setResult(data.diagnosis);
      toast.success(t.analysisComplete);
    } catch (error: any) {
      console.error("Full error:", error);
      toast.error(error.error || error.message || t.analysisFailed);
      setErrorDetails(JSON.stringify(error, null, 2));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAll = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setErrorDetails(null);
    setMetadata({ age: "", sex: "", localization: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center py-12 px-4 md:px-8 font-sans">
      <Toaster richColors theme={theme} position={lang === "ar" ? "top-left" : "top-right"} dir={lang === "ar" ? "rtl" : "ltr"} />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Header */}
        <header className="space-y-2 relative">
          <div className="absolute end-0 top-0 flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleLang} title="Switch Language" className="text-muted-foreground hover:text-foreground">
              <Globe className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme" className="text-muted-foreground hover:text-foreground">
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-2">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground text-lg w-10/12 leading-snug">{t.subtitle}</p>
        </header>

        {/* SECTION 1: SERVER WAKE PANEL */}
        <Card>
          <CardHeader className={cn("flex flex-row items-center justify-between", (status !== "Online" || isWaking || (status === "Online" && t.systemReady)) && "pb-4 border-b")}>
            <div className="space-y-1">
              <CardTitle className="text-lg">{t.serverStatus}</CardTitle>
              <CardDescription>{t.hfEndpointSubtitle[status]}</CardDescription>
            </div>
            <Badge 
              variant={status === "Online" ? "default" : status === "Starting" ? "secondary" : "destructive"}
              className={cn("px-3 text-sm", status === "Online" && "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20")}
            >
              <div className={cn("w-2 h-2 rounded-full me-2", 
                status === "Offline" ? "bg-white" : "bg-current animate-pulse"
              )} />
              {t.statusLabels[status]}
            </Badge>
          </CardHeader>
          {(status !== "Online" || isWaking || (status === "Online" && t.systemReady)) && (
            <CardContent className="pt-6">
              {isWaking ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="flex items-center text-muted-foreground">
                      <Clock className="w-4 h-4 me-2 animate-spin" /> 
                      {t.wakingServer}
                    </span>
                    <span>{Math.floor(wakeTimer / 60)}:{(wakeTimer % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <Progress value={wakeProgress} className="h-2" />
                </div>
              ) : (
                <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between gap-4">
                  {status === "Online" && t.systemReady ? (
                    <p className="text-sm text-muted-foreground">{t.systemReady}</p>
                  ) : status !== "Online" ? (
                    <>
                      <p className="text-sm text-muted-foreground">{t.endpointIdle}</p>
                      <Button onClick={handleWakeServer} disabled={isWaking} className="shrink-0">
                        {t.wakeServer}
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* SECTION 2: IMAGE UPLOAD */}
        {!result && (
          <Card className={cn("transition-opacity duration-300", status !== "Online" && "opacity-50 pointer-events-none")}>
            <CardHeader>
              <CardTitle className="text-lg">{t.caseInfo}</CardTitle>
              <CardDescription>{t.uploadDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50", "bg-muted/50"); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary/50", "bg-muted/50"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary/50", "bg-muted/50");
                  const file = e.dataTransfer.files[0];
                  if (file) handleUpload(file);
                }}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-muted/50",
                  preview ? "border-primary/50 bg-muted/20" : "border-border"
                )}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                />
                
                {preview ? (
                  <div className="space-y-4">
                    <div className="mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-lg border bg-background flex items-center justify-center">
                      <img 
                        src={preview} 
                        alt="Preview" 
                        className="h-full w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setImage(null); setPreview(null); }}>
                      {t.changeImage}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{t.clickOrDrag}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t.fileTypes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Fields */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="metadata" className="border-b-0 border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-medium">
                    <div className="flex items-center text-muted-foreground">
                      <Info className="w-4 h-4 me-2" />
                      {t.optionalMetadata}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-start">
                      <div className="space-y-2">
                        <Label htmlFor="age">{t.age}</Label>
                        <Input 
                          id="age" 
                          type="number"
                          min={0}
                          max={120}
                          placeholder={t.agePlaceholder}
                          value={metadata.age}
                          onChange={(e) => setMetadata(prev => ({ ...prev, age: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sex">{t.sex}</Label>
                        <Select dir={lang === "ar" ? "rtl" : "ltr"} onValueChange={(val) => setMetadata(prev => ({ ...prev, sex: val }))}>
                          <SelectTrigger id="sex">
                            <SelectValue placeholder={t.sexPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t.male}</SelectItem>
                            <SelectItem value="female">{t.female}</SelectItem>
                            <SelectItem value="other">{t.other}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label htmlFor="localization">{t.localization}</Label>
                        <Select dir={lang === "ar" ? "rtl" : "ltr"} onValueChange={(val) => setMetadata(prev => ({ ...prev, localization: val }))}>
                          <SelectTrigger id="localization">
                            <SelectValue placeholder={t.locPlaceholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {BODY_SITES.map(site => (
                              <SelectItem key={site} value={site}>
                                {t.bodySites[site as keyof typeof t.bodySites]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button 
                className="w-full text-base h-12"
                disabled={!image || isAnalyzing || status !== "Online"}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCcw className="w-5 h-5 me-2 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  t.analyzeLesion
                )}
              </Button>
              {errorDetails && (
                <div className="w-full mt-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-start overflow-hidden">
                  <Label className="text-red-700 dark:text-red-400 font-bold mb-2 block">{t.errorDetails}</Label>
                  <pre className="text-[10px] sm:text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono break-words max-h-64 overflow-y-auto p-2 bg-red-500/5 rounded">
                    {errorDetails}
                  </pre>
                </div>
              )}
            </CardFooter>
          </Card>
        )}

        {/* SECTION 3: RESULT */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-primary/30 shadow-lg">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{t.analysisComplete}</CardTitle>
                  <CardDescription>{t.aiClassification}</CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-6 pt-4">
                  <div className="space-y-4">
                    <Label className="text-muted-foreground uppercase tracking-widest text-xs font-semibold">{t.diagnosis}</Label>
                    <h2 className="text-3xl md:text-4xl font-bold px-4">{t.labels[result as keyof typeof t.labels] || result}</h2>
                    <div className="pt-2">
                      <Badge variant="outline" className={cn("text-sm py-1 px-4", SEVERITY_COLORS[result] || "bg-muted")}>
                        {result.includes("Melanoma") || result.includes("Carcinoma") ? t.malignant : t.benign}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm flex gap-3 text-start max-w-xl mx-auto">
                    <ShieldAlert className="w-5 h-5 shrink-0 pt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="font-semibold block mb-1">{t.medicalDisclaimer}</strong>
                      {t.disclaimerText}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 pt-6 border-t mt-4 rounded-b-xl">
                  <Button variant="outline" className="w-full bg-background" onClick={resetAll}>
                    <RefreshCcw className="w-4 h-4 me-2" />
                    {t.analyzeAnother}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}

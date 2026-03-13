
// @ts-nocheck

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import {
    Sparkles,
    Volume2,
    Image as ImageIcon,
    ChevronRight,
    RotateCcw,
    ChevronLeft,
    Loader2,
    Heart,
    School,
    Calendar,
    PenTool,
    BookOpen,
    ArrowRight,
    History,
    Trophy,
    X,
    CheckCircle,
    Check,
    Eraser,
    Pencil,
    Sun
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const isDummyConfig = firebaseConfig.apiKey === "dummy-api-key";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'school-diary-app';

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || "").trim(); // 実行環境のAPIキー（trim()で末尾スペース対策）
const GOOGLE_CLOUD_API_KEY = (import.meta.env.VITE_GOOGLE_CLOUD_API_KEY || "").trim(); // Google Cloud TTS API Key（trim()で末尾スペース対策）


const STEPS = [
    {
        id: 'when',
        label: 'いつのこと？',
        suggestions: [
            { label: 'きょう', icon: <div className="w-20 h-20 bg-slate-50 rounded-[2.2rem] flex items-center justify-center mb-2 shadow-sm border border-slate-100/50"><Sun className="text-orange-500" size={40} /></div> },
            { label: 'きのう', icon: <div className="w-20 h-20 bg-slate-50 rounded-[2.2rem] flex items-center justify-center mb-2 shadow-sm border border-slate-100/50"><div className="text-blue-400 text-4xl">🌙</div></div> }
        ]
    },
    {
        id: 'what',
        label: 'なにを した？',
        suggestions: [
            { label: 'こくご', icon: '📖' },
            { label: 'さんすう', icon: '➕' },
            { label: 'たいいく', icon: '🏃' },
            { label: 'おんがく', icon: '🎵' },
            { label: 'ずこう', icon: '🎨' },
            { label: 'やすみじかん', icon: '⚽' },
            { label: 'きゅうしょく', icon: '🍱' },
            { label: 'そうじ', icon: '🧹' },
            { label: 'かえりみち', icon: '🎒' }
        ]
    },
    {
        id: 'what_detail',
        label: 'なにした？',
        suggestions: [
            { label: 'ともだちとあそんだ', icon: '🤝' },
            { label: 'ひとりであそんだ', icon: '👤' },
            { label: 'さっかーした', icon: '⚽' },
            { label: 'おにごっこした', icon: '🏃' },
            { label: 'ブランコした', icon: '🎡' },
            { label: 'ドッチボールした', icon: '🏐' },
            { label: 'その他', icon: '✨' }
        ]
    },
    {
        id: 'friend_names',
        label: 'だれと あそんだ？',
        subLabel: '4にんまで えらべるよ',
        suggestions: [
            { label: 'あいりちゃん' }, { label: 'あきひくん' }, { label: 'きこちゃん' }, { label: 'りきぞうくん' },
            { label: 'みずきくん' }, { label: 'あさちゃん' }, { label: 'ゆうきくん' }, { label: 'みくちゃん' },
            { label: 'かれんちゃん' }, { label: 'みちひろくん' }, { label: 'かほちゃん' }, { label: 'かぜおくん' },
            { label: 'はつねちゃん' }, { label: 'そらくん' }, { label: 'みそらちゃん' }, { label: 'たけひろくん' },
            { label: 'たまきちゃん' }, { label: 'つむぎちゃん' }, { label: 'りこちゃん' }, { label: 'りゅうたくん' },
            { label: 'かえでちゃん' }, { label: 'あおちゃん' }, { label: 'まさきくん' }, { label: 'めいちゃん' }
        ]
    },
    {
        id: 'who',
        label: 'だれと した？',
        suggestions: [
            { label: 'ひとりで', icon: '👤' },
            { label: 'おともだちと', icon: '👦' },
            { label: 'せんせいと', icon: '👩‍🏫' },
            { label: 'みんなで', icon: '🙌' }
        ]
    },
    {
        id: 'feeling',
        label: 'どうだった？',
        suggestions: [
            { label: 'たのしかった', icon: '😄' },
            { label: 'がんばった', icon: '🔥' },
            { label: 'むずかしかった', icon: '🤔' },
            { label: 'おもしろかった', icon: '😆' }
        ]
    },
];

const SUBJECT_CONFIG = {
    'こくご': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'ほんを よんだ', text: 'ほんを よみました' },
                    { label: 'かいた', text: 'かきました' },
                    { label: 'かんじを べんきょうした', text: 'かんじを べんきょうしました' },
                    { label: 'かんじテスト', text: 'かんじテストが ありました' },
                    { label: 'じもんタイム', text: 'じもんタイム でした' },
                    { label: 'てを あげた', text: 'てを あげました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'できた', text: 'できて、うれしかったです。' },
                    { label: 'まあまあ', text: 'がんばりました。' },
                    { label: 'むずかしかった', text: 'むずかしかったですが、がんばりました。' }
                ]
            }
        ]
    },
    'さんすう': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'たしざん', text: 'たしざんを しました' },
                    { label: 'ひきざん', text: 'ひきざんを しました' },
                    { label: 'かけざん', text: 'かけざんを しました' },
                    { label: 'とけい', text: 'とけいの べんきょうを しました' },
                    { label: 'かたち', text: 'かたちの べんきょうを しました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'できた', text: 'じょうずに できました。うれしかったです。' },
                    { label: 'まあまあ', text: 'がんばり、できました。' },
                    { label: 'むずかしかった', text: 'むずかしかったですが、がんばりました。' }
                ]
            }
        ]
    },
    'おんがく': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'うたった', text: 'うたいました' },
                    { label: 'えんそうした', text: 'えんそうしました' },
                    { label: 'きいた', text: 'ききました' },
                    { label: 'リズムあそび', text: 'リズムあそびを しました' },
                    { label: 'れんしゅうした', text: 'れんしゅうしました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'できた', text: 'できました。うれしかったです。' },
                    { label: 'まあまあ', text: 'がんばりました。' },
                    { label: 'むずかしかった', text: 'むずかしかったですが、がんばりました。' }
                ]
            }
        ]
    },
    'ずこう': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'えを かいた', text: 'えを かきました' },
                    { label: 'つくった', text: 'つくりました' },
                    { label: 'ぬった', text: 'ぬりました' },
                    { label: 'きった', text: 'きりました' },
                    { label: 'はっぴょうした', text: 'はっぴょうしました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'たのしかった', text: 'たのしかったです。' },
                    { label: 'できた', text: 'できて、うれしかったです。' },
                    { label: 'むずかしかった', text: 'むずかしかったですが、がんばりました。' }
                ]
            }
        ]
    },
    'たいいく': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'はしった', text: 'はしりました' },
                    { label: 'サッカー', text: 'サッカーを しました' },
                    { label: 'ドッジボール', text: 'ドッジボールを しました' },
                    { label: 'とびばこ', text: 'とびばこを しました' },
                    { label: 'なわとび', text: 'なわとびを しました' },
                    { label: 'ダンス', text: 'ダンスを しました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'がんばった', text: 'さいごまで がんばりました。' },
                    { label: 'たのしかった', text: 'たのしかったです。' },
                    { label: 'つかれた', text: 'つかれましたが、がんばりました。' }
                ]
            }
        ]
    },
    'きゅうしょく': {
        steps: [
            {
                id: 'what_detail',
                question: 'どうだった？',
                options: [
                    { label: 'おいしかった', text: 'おいしかったです' },
                    { label: 'ぜんぶ たべた', text: 'ぜんぶ たべました' },
                    { label: 'すこし のこした', text: 'すこし のこしましたが、たべました' },
                    { label: 'あたらしい ものを たべた', text: 'あたらしい ものを たべました' }
                ]
            },
            {
                id: 'feeling',
                question: 'かんそうは？',
                options: [
                    { label: 'まんぷく', text: 'おなかが いっぱいです。' },
                    { label: 'うれしい', text: 'うれしかったです。' },
                    { label: 'よかった', text: 'よかったです。' }
                ]
            }
        ]
    },
    'そうじ': {
        steps: [
            {
                id: 'what_detail',
                question: 'なにを した？',
                options: [
                    { label: 'ほうき', text: 'ほうき' },
                    { label: 'ぞうきん', text: 'ぞうきん' },
                    { label: 'つくえを ならべた', text: 'つくえ ならべ' },
                    { label: 'ごみを あつめた', text: 'ごみ あつめ' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'がんばった', text: 'きれいに できました。' },
                    { label: 'きれいになった', text: 'ピカピカに なって、うれしかったです。' },
                    { label: 'つかれた', text: 'つかれたけど、がんばりました。' }
                ]
            }
        ]
    },
    'かえりみち': {
        steps: [
            {
                id: 'what_detail',
                question: 'どうだった？',
                options: [
                    { label: 'ともだちと かえった', text: 'ともだちと かえりました' },
                    { label: 'ひとりで かえった', text: 'ひとりで かえりました' },
                    { label: 'あそびながら かえった', text: 'あそびながら かえりました' },
                    { label: 'あんぜんに かえれた', text: 'あんぜんに かえりました' }
                ]
            },
            {
                id: 'feeling',
                question: 'どうだった？',
                options: [
                    { label: 'たのしかった', text: 'たのしく かえりました。' },
                    { label: 'よかった', text: 'よかったです。' },
                    { label: 'つかれた', text: 'つかれました。' }
                ]
            }
        ]
    }
};

const TracingCanvas = ({ text, onCancel, onSpeak, onSave }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const resize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            ctx.lineCap = 'round';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#2563eb';
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, []);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);
    const clearCanvas = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const handleComplete = () => {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in fade-in duration-300 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
                <button onClick={onCancel} className="w-12 h-12 rounded-full flex items-center justify-center text-slate-300 active:scale-90"><X size={32} /></button>
                <h2 className="text-xl font-black text-slate-800">なぞってみよう</h2>
                <button onClick={onSpeak} className="w-12 h-12 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white active:scale-90"><Volume2 size={24} /></button>
            </div>
            <div className="flex-1 p-4 md:p-8 flex justify-center items-center">
                <div className="w-full h-full max-w-5xl bg-white rounded-[2.5rem] shadow-xl border-[6px] border-blue-50 relative overflow-hidden flex flex-row-reverse p-10">
                    <div className="absolute inset-0 p-10 flex flex-row-reverse justify-start select-none pointer-events-none z-0" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                        <p className="text-[5.2vh] font-black text-slate-100 leading-[1.9] tracking-[0.18em] whitespace-pre-wrap">{text}</p>
                    </div>
                    <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10" />
                    <div className="absolute inset-4 border-2 border-dashed border-blue-100 rounded-[2rem] pointer-events-none opacity-40 z-0" />
                </div>
            </div>
            <div className="bg-white px-8 py-6 border-t border-slate-100 flex gap-4">
                <button onClick={clearCanvas} className="flex-1 h-16 bg-slate-50 text-slate-400 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95"><Eraser size={24} /> けす</button>
                <button onClick={handleComplete} className="flex-1 h-16 bg-blue-600 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-blue-200"><CheckCircle size={24} /> できた！</button>
            </div>
        </div>
    );
};

const Hanamaru = ({ className }) => (
    <div className={`${className} rotate-[12deg] origin-center w-max select-none pointer-events-none`}>
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border-[3px] border-rose-500 bg-white shadow-sm">
            <span className="text-rose-500 font-black text-sm tracking-[0.1em] whitespace-nowrap">よくできました</span>
        </div>
    </div>
);

export default function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('home');
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({ when: '', what: '', what_detail: '', friend_names: [], who: '', feeling: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [finalSentence, setFinalSentence] = useState('');
    const [userHandwriting, setUserHandwriting] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [isTracingMode, setIsTracingMode] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    // iOSの事前bless用Audio要素（speakSentence内で使い回す）
    const audioElRef = useRef<HTMLAudioElement | null>(null);

    // ※ AudioContextはページ読み込み時には生成しない
    // iOSはユーザー操作前に生成した AudioContext を強制的に suspended にするため、
    // 初回ユーザー操作（unlockAudio呼び出し）時に遅延生成する。

    useEffect(() => {
        // 音声リスト事前ロード（SpeechSynthesis用）
        const load = () => speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = load;
        load();
        return () => {
            speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // ユーザー操作時にAudioContextを生成・再開する関数
    // iOSでは必ずボタンタップ等のユーザーインタラクション内で呼ぶ必要がある
    const unlockAudio = async () => {
        try {
            // AudioContextが未生成なら遅延生成（ユーザー操作内でのみ有効）
            if (!audioContextRef.current) {
                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                if (AudioContextClass) {
                    audioContextRef.current = new AudioContextClass();
                    console.log("AudioContext created on user interaction");
                }
            }
            const ctx = audioContextRef.current;
            if (!ctx) return;

            // suspended状態なら再開する
            if (ctx.state === 'suspended') {
                await ctx.resume();
                console.log("AudioContext resumed:", ctx.state);
            }

            // 無音バッファを再生して「ユーザー許可済み」状態にする（iOS必須）
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);

            // ＋α ネイティブの音声合成 (SpeechSynthesis) も初回に無音再生してiOSのロックを解除する
            if (window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance('');
                utterance.volume = 0; // 無音で再生
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.error("Audio unlock failed:", e);
        }
    };

    const getPreferredVoice = () => {
        const voices = speechSynthesis.getVoices();
        return (
            voices.find(v => v.lang === "ja-JP" && v.name.includes("Google")) ||
            voices.find(v => v.lang === "ja-JP" && v.name.includes("Kyoko")) ||
            voices.find(v => v.lang === "ja-JP" && v.name.includes("O-Ren")) ||
            voices.find(v => v.lang === "ja-JP")
        );
    };

    const onSpeak = () => {
        speakSentence(finalSentence);
    };

    const today = new Date();
    const dateString = `${today.getMonth() + 1}月 ${today.getDate()}日`;
    const dayString = ['にちようび', 'げつようび', 'かようび', 'すいようび', 'もくようび', 'きんようび', 'どようび'][today.getDay()];

    // Firebase Auth Setup
    useEffect(() => {
        console.log("Neural2 Key Present:", !!GOOGLE_CLOUD_API_KEY);
        console.log("Gemini Key Present:", !!API_KEY, "| value:", API_KEY ? API_KEY.slice(0, 8) + "..." : "EMPTY");
        const initAuth = async () => {

            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Firebase Data Fetching
    useEffect(() => {
        if (!user) return;
        if (isDummyConfig) {
            // Local Storage Loading
            const loadLocalEntries = () => {
                const saved = localStorage.getItem('school_diary_entries');
                if (saved) {
                    try {
                        const entries = JSON.parse(saved);
                        setDiaryEntries(entries.sort((a, b) => b.timestamp - a.timestamp));
                    } catch (e) {
                        console.error("Failed to parse local entries", e);
                    }
                }
            };
            loadLocalEntries();
            // Listen for storage events to update if changed in another tab
            window.addEventListener('storage', loadLocalEntries);
            return () => window.removeEventListener('storage', loadLocalEntries);
        } else {
            // Firebase Loading
            const q = collection(db, 'artifacts', appId, 'users', user.uid, 'diary_entries');
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setDiaryEntries(entries.sort((a, b) => b.timestamp - a.timestamp));
            }, (error) => console.error("Firestore Error:", error));
            return () => unsubscribe();
        }
    }, [user]);

    const pcmToWav = (pcmData, sampleRate) => {
        const buffer = new ArrayBuffer(44 + pcmData.length);
        const view = new DataView(buffer);
        const writeString = (offset, string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
        writeString(0, 'RIFF'); view.setUint32(4, 36 + pcmData.length, true); writeString(8, 'WAVE'); writeString(12, 'fmt ');
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeString(36, 'data');
        view.setUint32(40, pcmData.length, true); new Uint8Array(buffer, 44).set(new Uint8Array(pcmData)); return new Blob([buffer], { type: 'audio/wav' });
    };

    const isSubjectMode = answers.what && SUBJECT_CONFIG[answers.what];

    const generateDiaryText = (data) => {
        const { when, what, what_detail, friend_names, who, feeling } = data;

        let whenText = when;
        // Subject Mode Logic
        if (SUBJECT_CONFIG[what]) {
            const config = SUBJECT_CONFIG[what];
            const detailOpt = config.steps[0].options.find(o => o.label === what_detail);
            const feelingOpt = config.steps[1].options.find(o => o.label === feeling);

            const detailText = detailOpt ? detailOpt.text : what_detail;
            let feelingText = feelingOpt ? feelingOpt.text : feeling;

            // Custom logic for 'Reading' in Kokugo
            if (what === 'こくご' && what_detail === 'ほんを よんだ' && feeling === 'できた') {
                feelingText = 'じょうずに よめて、うれしかったです。';
            }

            // Subject-specific prefixes and structures
            if (what === 'きゅうしょく') {
                return `${when}の ${what}は、${detailText}。 ${feelingText}`;
            } else if (what === 'そうじ') {
                // If it ends with 'をしました', remove it to avoid double usage if needed, but here we just construct noun phrases
                // Using "〜をしました" is good.
                // Refine options text to be Noun based for better flexibility?
                // Actually my options update above made them nouns mostly.
                // Let's handle verb conjugation.
                let action = detailText;
                if (!action.includes('ました')) action = `${action}を しました`;

                return `${when}、そうじの じかんに ${action}。 ${feelingText}`;
            } else if (what === 'かえりみち') {
                return `${when}は、${detailText}。 ${feelingText}`;
            } else {
                return `${when}の ${what}の じゅぎょうで、${detailText}。 ${feelingText}`;
            }
        }

        let timeText = "";
        if (what === 'かえりみち') timeText = 'かえりみちに、';
        else if (what === 'やすみじかん') timeText = 'やすみじかんに、';
        else if (what === 'きゅうしょく') timeText = 'きゅうしょくの じかんに、';
        else if (what === 'そうじ') timeText = 'そうじの じかんに、';
        else timeText = `${what}の じかんに、`;

        let peopleText = "";
        if (friend_names && friend_names.length > 0) {
            peopleText = friend_names.join('と、') + 'と ';
        } else if (who && who !== 'ひとりで') {
            peopleText = who + ' ';
        }

        let actionText = "";
        if (what_detail) {
            if (what_detail === 'ともだちとあそんだ') actionText = 'あそびました。';
            else if (what_detail === 'ひとりであそんだ') actionText = 'あそびました。';
            else if (what_detail.endsWith('した')) actionText = what_detail.replace('した', 'を しました。');
            else actionText = `${what_detail}を しました。`;
        } else {
            if (what === 'こくご' || what === 'さんすう') actionText = 'べんきょうを しました。';
            else if (what === 'たいいく') actionText = 'うんどうを しました。';
            else if (what === 'おんがく') actionText = 'うたを うたいました。';
            else if (what === 'ずこう') actionText = 'こうさくを しました。';
            else if (what === 'きゅうしょく') actionText = 'ごはんを たべました。';
            else if (what === 'そうじ') actionText = 'きれいに しました。';
            else if (what === 'かえりみち') actionText = 'かえりました。';
            else actionText = 'すごしました。';
        }

        let feelingText = "";
        if (feeling === 'たのしかった') feelingText = 'とても たのしかったです。';
        else if (feeling === 'がんばった') feelingText = 'とても がんばりました。';
        else if (feeling === 'むずかしかった') feelingText = 'すこし むずかしかったです。';
        else if (feeling === 'おもしろかった') feelingText = 'とても おもしろかったです。';

        return `${whenText}、${timeText}${peopleText}${actionText} ${feelingText}`;
    };

    const refineSentence = async (targetAnswers) => {
        setIsProcessing(true);
        setStatusMessage('にっきを まとめています...');
        const finalAnswers = targetAnswers || answers;

        try {
            if (isDummyConfig) {
                // Use local generation logic
                await new Promise(resolve => setTimeout(resolve, 800)); // Fake delay for UX
                const resultText = generateDiaryText(finalAnswers);
                setFinalSentence(resultText);
                setView('result');
            } else {
                // Use Gemini API
                let activity = finalAnswers.what;
                if (finalAnswers.what === 'やすみじかん' && finalAnswers.what_detail) activity = finalAnswers.what_detail;
                let people = finalAnswers.who;
                if (finalAnswers.friend_names?.length > 0) people = finalAnswers.friend_names.join('と、');

                const systemPrompt = `あなたは小学1年生の先生です。子供が選んだ単語で自然な日記の1文を作ってください。構成は「いつ　なにの時間に　だれと　なにをして　きもち。」名前は全員必ず入れ、ひらがな多め、語尾は「～しました」「～でした」。`;
                const userPrompt = `キーワード：いつ=${finalAnswers.when}、なにの時間=${finalAnswers.what}、具体的になにをした=${activity}、だれと=${people}、きもち=${finalAnswers.feeling}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: userPrompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
                });
                const data = await response.json();
                const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || generateDiaryText(finalAnswers);
                setFinalSentence(resultText);
                setView('result');
            }
        } catch (error) {
            console.error(error);
            setFinalSentence(generateDiaryText(finalAnswers));
            setView('result');
        } finally { setIsProcessing(false); setStatusMessage(''); }
    };

    // Base64音声データをWeb Audio APIで再生する
    // fallback: 再生失敗時に呼び出す代替関数（省略可）
    const playAudioData = async (base64Data, fallback?: () => void) => {
        // AudioContextが未生成の場合は失敗扱い
        if (!audioContextRef.current) {
            console.warn("playAudioData: AudioContext not initialized, using fallback");
            fallback?.();
            return;
        }
        const ctx = audioContextRef.current;

        try {
            // suspended状態なら再開
            if (ctx.state === 'suspended') await ctx.resume();

            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            const arrayBuffer = bytes.buffer;

            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => { setIsProcessing(false); setStatusMessage(''); };
            source.start(0);
        } catch (error) {
            // alertは使わず、fallbackに処理を委譲する
            console.error("Web Audio API Error:", error);
            fallback?.();
        }
    };

    const speakSentence = async (textToSpeak?) => {
        const text = textToSpeak || finalSentence;
        if (!text) return;
        setIsProcessing(true);

        // ─────────────────────────────────────────────────────────────────────
        // Step 1: iOS 初回操作でのAudioContextロック解除（Web Audio API）
        // ─────────────────────────────────────────────────────────────────────
        await unlockAudio();

        // ─────────────────────────────────────────────────────────────────────
        // Step 2: 最終フォールバック用ネイティブTTS定義
        // ─────────────────────────────────────────────────────────────────────
        const speakNative = (txt: string) => {
            setStatusMessage('ブラウザのこえで よみます...');
            const utterance = new SpeechSynthesisUtterance(txt);
            utterance.lang = 'ja-JP';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            const voice = getPreferredVoice();
            if (voice) utterance.voice = voice;
            
            utterance.onend = () => {
                setIsProcessing(false);
                setStatusMessage('');
            };
            utterance.onerror = () => {
                setIsProcessing(false);
                setStatusMessage('');
            };

            // Safariでは、speechSynthesisが停止状態になっていることがあるためリセット
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        };

        // Web Audio APIでArrayBufferを再生する共通ヘルパー（iOS対応の要）
        const playWithWebAudio = async (base64String: string, isWav: boolean, onEnded: () => void, onError: (e: any) => void) => {
            if (!audioContextRef.current) {
                onError(new Error("AudioContext not initialized"));
                return;
            }
            try {
                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();

                let arrayBuffer: ArrayBuffer;

                if (isWav) {
                    // Gemini TTSのPCMデータ(Base64)から一旦WAV Blobを作成し、ArrayBufferへ変換
                    const binaryString = atob(base64String);
                    const pcmData = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) pcmData[i] = binaryString.charCodeAt(i);
                    // ここに渡されるデータは 24kHz 前提
                    const wavBlob = pcmToWav(pcmData, 24000); 
                    arrayBuffer = await wavBlob.arrayBuffer();
                } else {
                    // Neural2のMP3データ(Base64)から直接ArrayBufferへ変換
                    const binaryString = atob(base64String);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                    // 安全に独立したArrayBufferを作成
                    arrayBuffer = bytes.buffer.slice(0, bytes.length);
                }

                // decodeAudioDataのiOS Safari対応（コールバックとPromise両対応）
                const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
                    const promise = ctx.decodeAudioData(
                        arrayBuffer,
                        (decoded) => resolve(decoded),
                        (error) => reject(error)
                    );
                    // 近年のブラウザならPromiseが返るためcatchも拾っておく
                    if (promise) {
                        promise.catch((error) => reject(error));
                    }
                });

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = onEnded;
                source.start(0);
            } catch (err) {
                // decodeAudioData に失敗した場合はネイティブへ流す
                console.error("decodeAudioData or playback failed:", err);
                onError(err);
            }
        };

        // ─────────────────────────────────────────────────────────────────────
        // Step 3: Gemini 2.5 Flash Preview TTS（Kore）— 最優先
        // ─────────────────────────────────────────────────────────────────────
        if (API_KEY) {
            try {
                setStatusMessage('Koreの やさしいこえで よんでいます...');
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'gemini-2.5-flash-preview-tts',
                            contents: [{ parts: [{ text }] }],
                            generationConfig: {
                                responseModalities: ['AUDIO'],
                                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                            }
                        })
                    }
                );
                if (!geminiResponse.ok) throw new Error(`Gemini TTS HTTP error: ${geminiResponse.status}`);

                const geminiData = await geminiResponse.json();
                const inlineData = geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData;
                if (!inlineData?.data) throw new Error('Gemini TTS: 音声データなし');

                await playWithWebAudio(
                    inlineData.data, // Base64テキストをそのまま渡す
                    true, // isWav = true
                    () => { setIsProcessing(false); setStatusMessage(''); },
                    (e) => {
                        console.error('Gemini TTS WebAudio再生エラー → Neural2へ', e);
                        tryNeural2OrNative(text);
                    }
                );
                return;

            } catch (error) {
                console.error('Gemini TTS エラー → Neural2へフォールバック:', error);
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Step 4: Google Cloud TTS (Neural2) — Gemini TTSのフォールバック
        // ─────────────────────────────────────────────────────────────────────
        const tryNeural2OrNative = async (txt: string) => {
            if (GOOGLE_CLOUD_API_KEY) {
                try {
                    setStatusMessage('Neural2の こえで よんでいます...');
                    const n2Response = await fetch(
                        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                input: { text: txt },
                                voice: { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B' },
                                audioConfig: {
                                    audioEncoding: 'MP3',
                                    speakingRate: 0.85,
                                    pitch: 2.0,
                                }
                            })
                        }
                    );
                    if (!n2Response.ok) throw new Error(`Neural2 HTTP: ${n2Response.status}`);

                    const n2Data = await n2Response.json();
                    if (!n2Data.audioContent) throw new Error('Neural2: audioContentが空');

                    await playWithWebAudio(
                        n2Data.audioContent, // Base64テキストをそのまま渡す
                        false, // isWav = false (MP3)
                        () => { setIsProcessing(false); setStatusMessage(''); },
                        (e) => {
                            console.error('Neural2 WebAudio再生エラー → ネイティブTTSへ', e);
                            speakNative(txt);
                        }
                    );
                    return;

                } catch (error) {
                    console.error('Neural2 エラー → ネイティブTTSへ:', error);
                }
            }
            // ─────────────────────────────────────────────────────────────────
            // Step 5: 最終フォールバック → ブラウザネイティブTTS
            // ─────────────────────────────────────────────────────────────────
            speakNative(txt);
        };

        await tryNeural2OrNative(text);
    };


    const saveDiaryEntry = async () => {
        if (!user && !isDummyConfig) return; // Allow save in dummy mode without user
        setIsProcessing(true);
        setStatusMessage('クラウドに ほぞんしています...');
        try {
            if (isDummyConfig) {
                // Local Storage Saving
                const newEntry = {
                    id: uuidv4(),
                    date: dateString,
                    timestamp: Date.now(),
                    text: finalSentence,
                    handwriting: userHandwriting
                };
                const existing = JSON.parse(localStorage.getItem('school_diary_entries') || '[]');
                const updated = [newEntry, ...existing];
                localStorage.setItem('school_diary_entries', JSON.stringify(updated));
                // Force update state immediately for specific user action
                setDiaryEntries(updated.sort((a, b) => b.timestamp - a.timestamp));
            } else {
                // Firebase Saving
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'diary_entries'), {
                    date: dateString,
                    timestamp: Date.now(),
                    text: finalSentence,
                    handwriting: userHandwriting
                });
            }
            setView('home');
            setUserHandwriting(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const findStepIndex = (id) => STEPS.findIndex(s => s.id === id);
    const shouldShowFriendNames = (detail) => ['ともだちとあそんだ', 'おにごっこした', 'さっかーした', 'ブランコした', 'ドッチボールした'].includes(detail);

    const toggleFriend = (name) => {
        const current = answers.friend_names || [];
        if (current.includes(name)) {
            setAnswers({ ...answers, friend_names: current.filter(n => n !== name) });
        } else {
            if (current.length < 4) {
                setAnswers({ ...answers, friend_names: [...current, name] });
            }
        }
    };

    const getCurrentSteps = () => {
        if (answers.what && SUBJECT_CONFIG[answers.what]) {
            const subjectSteps = SUBJECT_CONFIG[answers.what].steps;
            return [STEPS[0], STEPS[1], ...subjectSteps];
        }
        return STEPS;
    };

    const handleChoice = (stepId, value) => {
        const newAnswers = { ...answers, [stepId]: value };
        setAnswers(newAnswers);

        // Subject Mode Navigation Override
        if (SUBJECT_CONFIG[newAnswers.what]) {
            const currentSteps = getCurrentSteps();
            const currentIndex = currentSteps.findIndex(s => s.id === stepId);

            if (currentIndex < currentSteps.length - 1) {
                // Determine next step based on index since config steps don't map to STEPS index directly
                // Logic: 
                // when (0) -> what (1)
                // what (1) -> if subject, subject step 1 (2)
                // subject step 1 (2) -> subject step 2 (3)
                // subject step 2 (3) -> refine

                // We need to know which STEP object corresponds to next index
                // Since we don't have a single flattened array in state (we use getCurrentSteps), 
                // we rely on currentStep index.

                // wait, currentStep is an index into STEPS usually.
                // But with dynamic steps, we need to be careful.
                // Existing code uses `currentStep` state as index into `STEPS`. 
                // We should change `currentStep` to index into `getCurrentSteps()`.

                // Let's refactor navigation to use simple increment if possible, or mapping.
                // But `handleChoice` logic was relying on `STEPS` indices hardcoded.

                // Rewrite:
                if (stepId === 'when') setCurrentStep(1); // to 'what'
                else if (stepId === 'what') setCurrentStep(2); // to first subject step
                else if (stepId === 'what_detail') setCurrentStep(3); // to feeling
                else if (stepId === 'feeling') refineSentence(newAnswers);
            }
            return;
        }

        // Standard Navigation
        unlockAudio(); // Aggressive unlock on navigation
        if (stepId === 'when') setCurrentStep(findStepIndex('what'));
        else if (stepId === 'what') {
            if (value === 'やすみじかん') setCurrentStep(findStepIndex('what_detail'));
            else setCurrentStep(findStepIndex('who'));
        } else if (stepId === 'what_detail') {
            if (shouldShowFriendNames(value)) setCurrentStep(findStepIndex('friend_names'));
            else setCurrentStep(findStepIndex('who'));
        } else if (stepId === 'who') setCurrentStep(findStepIndex('feeling'));
        else if (stepId === 'feeling') refineSentence(newAnswers);
    };

    return (
        <div className="min-h-[100dvh] bg-[#FDFCFB] text-slate-900 font-sans antialiased overflow-x-hidden touch-manipulation" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
            {isTracingMode && <TracingCanvas text={finalSentence} onCancel={() => setIsTracingMode(false)} onSpeak={onSpeak} onSave={(data) => { setUserHandwriting(data); setIsTracingMode(false); }} />}

            <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
                    <div className="w-10 h-10 bg-orange-500 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg"><School size={24} /></div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">がっこうにっき</h1>
                </div>
                {view !== 'home' && <button onClick={() => setView('home')} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 active:scale-90"><X size={18} /></button>}
            </nav>

            <main className="max-w-xl mx-auto px-4 mt-2">
                {view === 'home' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="bg-white rounded-[2.8rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-4 right-4 flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full text-orange-600 font-bold text-xs"><Trophy size={14} /><span>x {diaryEntries.length}</span></div>
                            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3"><Calendar size={32} /></div>
                            <p className="text-slate-400 font-bold text-sm mb-1">{dayString}</p>
                            <h2 className="text-3xl font-black text-slate-800 mb-6 tracking-tight">{dateString}</h2>
                            <button onClick={() => { unlockAudio(); setAnswers({ when: '', what: '', what_detail: '', friend_names: [], who: '', feeling: '' }); setCurrentStep(0); setUserHandwriting(null); setView('step'); }} className="w-full bg-orange-500 text-white rounded-[1.8rem] py-6 flex items-center justify-center gap-4 shadow-xl shadow-orange-200 active:scale-[0.98] transition-all"><PenTool size={24} /><span className="text-xl font-black">にっきを かく</span></button>
                        </div>
                        {/* Audio Debug / Test Button */}
                        <div className="flex justify-center">
                            <button onClick={async () => {
                                await unlockAudio();
                                // Test Tone
                                if (audioContextRef.current) {
                                    const ctx = audioContextRef.current;
                                    const osc = ctx.createOscillator();
                                    const gain = ctx.createGain();
                                    osc.type = 'sine';
                                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                                    osc.connect(gain);
                                    gain.connect(ctx.destination);
                                    osc.start();
                                    osc.stop(ctx.currentTime + 0.2);
                                    alert(`Sound Test: ${ctx.state}`);
                                } else {
                                    alert("No AudioContext");
                                }
                            }} className="text-lg bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg font-bold my-4"><Volume2 size={20} /> 音声テスト（ここをおしてね）</button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2"><h3 className="font-black text-slate-400 text-xs tracking-widest uppercase flex items-center gap-2"><History size={14} /> おもいで</h3><button onClick={() => setView('history')} className="text-blue-500 text-sm font-bold">すべてみる</button></div>
                            <div className="grid grid-cols-1 gap-4 pb-10">
                                {diaryEntries.slice(0, 1).map(entry => (
                                    <div key={entry.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-4">
                                        <p className="text-xl font-black text-slate-800 leading-relaxed tracking-tight">{entry.text}</p>
                                        {entry.handwriting && <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 shadow-inner"><img src={entry.handwriting} className="w-full h-auto object-contain max-h-32" /></div>}
                                    </div>
                                ))}
                                {diaryEntries.length === 0 && <div className="bg-slate-50 rounded-[2.5rem] p-12 border-2 border-dashed border-slate-100 flex flex-col items-center gap-4 opacity-40"><BookOpen size={48} className="text-slate-200" /><p className="text-sm font-bold text-slate-400 text-center">にっきを かくと ここに<br />おもいでが たまっていくよ</p></div>}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'step' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex justify-between items-center px-2">
                            {/* Subject Mode Indicator or Standard Progress */}
                            {isSubjectMode ? (
                                <div className="flex flex-col"><span className="text-sm font-black text-slate-800 tracking-tighter">あと {Math.max(0, 4 - currentStep)}ステップ</span></div>
                            ) : (
                                <div className="flex flex-col"><span className="text-sm font-black text-slate-800 tracking-tighter">{STEPS[currentStep].id === 'friend_names' ? `${answers.friend_names?.length || 0}にん えらんだよ` : `のこり ${STEPS.length - currentStep}つ`}</span></div>
                            )}

                            <div className="flex gap-1.5">
                                {/* Simple progress dots fallback for subject mode */}
                                {isSubjectMode ? (
                                    [0, 1, 2, 3].map(i => <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i <= currentStep ? 'bg-orange-500' : 'bg-slate-200'}`} />)
                                ) : (
                                    STEPS.map((step, i) => {
                                        if (step.id === 'what_detail' && answers.what !== 'やすみじかん') return null;
                                        if (step.id === 'friend_names' && !shouldShowFriendNames(answers.what_detail)) return null;
                                        if (step.id === 'who' && (answers.friend_names?.length > 0)) return null;
                                        return <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i <= currentStep ? 'bg-orange-500' : 'bg-slate-200'}`} />;
                                    })
                                )}
                            </div>
                        </div>
                        <div className="bg-white rounded-3xl px-5 py-4 shadow-xl border border-slate-50 min-h-[50dvh] flex flex-col">
                            {isSubjectMode && currentStep >= 2 ? (
                                // Subject Mode Specific Render
                                (() => {
                                    const config = SUBJECT_CONFIG[answers.what];
                                    const sStep = config.steps[currentStep - 2];
                                    if (!sStep) return null;
                                    return (
                                        <div className="flex flex-col h-full">
                                            <h2 className="text-xl font-black mb-4 text-slate-800 tracking-tight">{sStep.question}</h2>
                                            <div className="flex-1 overflow-y-auto grid grid-cols-1 gap-2 content-start">
                                                {sStep.options.map((option) => (
                                                    <button
                                                        key={option.label}
                                                        onClick={() => handleChoice(sStep.id, option.label)}
                                                        className={`
                                                            p-4 text-lg font-bold rounded-xl transition-all shadow-sm border-2 text-left
                                                            ${answers[sStep.id] === option.label
                                                                ? 'bg-blue-100 border-blue-500 text-blue-800'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300'
                                                            }
                                                        `}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="mt-2 p-3 bg-orange-50/50 rounded-xl border-2 border-dashed border-orange-100 min-h-0 flex items-center justify-center">
                                                <p className="text-base text-slate-700 font-bold text-center leading-relaxed">
                                                    {(() => {
                                                        const detail = answers.what_detail || '_____';

                                                        const config = SUBJECT_CONFIG[answers.what];
                                                        const detailOpt = config.steps[0].options.find(o => o.label === detail);
                                                        const feelingOpt = config.steps[1].options.find(o => o.label === (answers.feeling || ''));

                                                        const detailText = detailOpt ? detailOpt.text : '_____';
                                                        let feelingText = feelingOpt ? feelingOpt.text : '';

                                                        if (answers.what === 'こくご' && answers.what_detail === 'ほんを よんだ' && answers.feeling === 'できた') {
                                                            feelingText = 'じょうずに よめて、うれしかったです。';
                                                        }

                                                        let prefix = `${answers.when}の ${answers.what}の じゅぎょうで、`;
                                                        if (answers.what === 'きゅうしょく') prefix = `${answers.when}の ${answers.what}は、`;
                                                        else if (answers.what === 'そうじ') prefix = `${answers.when}、${answers.what}の じかんに `;
                                                        else if (answers.what === 'かえりみち') prefix = `${answers.when}は、`;
                                                        else prefix = `${answers.when}の ${answers.what}の じゅぎょうで、`;

                                                        let action = detailText;
                                                        if (answers.what === 'そうじ' && !action.includes('ました')) action = `${action}を しました`;

                                                        return (
                                                            <>
                                                                {prefix}{action}。 {feelingText}
                                                            </>
                                                        );
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                // Standard Render
                                <>
                                    <h2 className="text-xl font-black mb-4 text-slate-800 tracking-tight">{STEPS[currentStep].label}</h2>
                                    <div className="flex-1 overflow-y-auto pr-2 pb-4 scrollbar-hide">
                                        <div className={`grid gap-3 ${STEPS[currentStep].id === 'when' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            {STEPS[currentStep].suggestions.map(s => {
                                                const isSelected = STEPS[currentStep].id === 'friend_names' ? answers.friend_names?.includes(s.label) : answers[STEPS[currentStep].id] === s.label;
                                                return (
                                                    <button key={s.label} onClick={() => STEPS[currentStep].id === 'friend_names' ? toggleFriend(s.label) : handleChoice(STEPS[currentStep].id, s.label)} className={`rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${isSelected ? 'bg-blue-50 border-blue-400 ring-4 ring-blue-50 text-blue-600' : 'bg-white border-slate-50 text-slate-600 hover:border-slate-100'} ${STEPS[currentStep].id === 'when' ? 'py-4' : 'p-3 shadow-sm'}`}>
                                                        {isSelected && STEPS[currentStep].id === 'friend_names' && <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md"><Check size={14} strokeWidth={4} /></div>}
                                                        {s.icon && <div>{typeof s.icon === 'string' ? <span className="text-3xl">{s.icon}</span> : s.icon}</div>}
                                                        <span className={`${STEPS[currentStep].id === 'when' ? 'text-xl' : 'text-sm'} font-bold`}>{s.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { if (currentStep === findStepIndex('friend_names')) setCurrentStep(findStepIndex('what_detail')); else if (currentStep > 0) setCurrentStep(currentStep - 1); }} className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 active:scale-95 shadow-sm"><ChevronLeft size={28} /></button>
                            {((isSubjectMode && currentStep === 2) || (STEPS[currentStep].id === 'friend_names')) && (
                                <button
                                    onClick={() => {
                                        if (isSubjectMode) refineSentence(answers);
                                        else setCurrentStep(findStepIndex('feeling'));
                                    }}
                                    disabled={isSubjectMode ? !answers.feeling : answers.friend_names?.length === 0}
                                    className={`h-14 flex-1 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl ${(isSubjectMode ? answers.feeling : answers.friend_names?.length > 0)
                                        ? 'bg-blue-600 text-white shadow-blue-200'
                                        : 'bg-slate-200 text-white cursor-not-allowed'
                                        }`}
                                >
                                    これでOK<ChevronRight size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {
                    view === 'result' && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-700">
                            <div className="bg-white rounded-[3.2rem] shadow-2xl border border-slate-50 overflow-hidden relative">
                                <div className="p-10 relative">
                                    <Hanamaru className="absolute top-8 right-8 z-10 animate-in zoom-in-50 spin-in-6 duration-1000 ease-out fill-mode-backwards" />
                                    <div className="flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase mb-8 tracking-[0.2em]"><Heart size={12} fill="currentColor" />きょうの にっき</div>
                                    <div className="flex flex-col gap-8">
                                        <div className="bg-white p-8 rounded-[2rem] border-l-[10px] border-blue-500 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden">
                                            <p className="text-[28px] font-black leading-[1.65] text-slate-800 tracking-tight">{finalSentence}</p>
                                        </div>
                                        {userHandwriting && (
                                            <div className="bg-white px-6 py-5 rounded-[2.2rem] border-2 border-dashed border-blue-100/60 shadow-sm relative animate-in fade-in slide-in-from-bottom-2">
                                                <div className="absolute -top-3 left-6 bg-white px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                                                    <Pencil size={10} className="text-blue-400" />
                                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest font-sans">じぶんの 文字</span>
                                                </div>
                                                <div className="bg-white flex justify-center py-2"><img src={userHandwriting} alt="User handwriting" className="w-full h-auto max-h-48 object-contain px-4" /></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-12 flex items-center gap-4">
                                        <button onClick={() => setIsTracingMode(true)} className="flex-1 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center gap-3 font-black active:scale-95 border border-slate-100 hover:bg-slate-100 transition-colors">
                                            <Pencil size={20} className="text-blue-500" />
                                            <span className="text-sm">{userHandwriting ? 'かきなおす' : 'なぞってみる'}</span>
                                        </button>
                                        <button onClick={() => speakSentence()} className="h-16 w-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 active:scale-90 transition-all"><Volume2 size={30} /></button>
                                    </div>

                                </div>
                            </div>
                            <button onClick={saveDiaryEntry} className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] mt-2 border-b-4 border-black">保存して おわる<CheckCircle size={24} className="text-green-400" /></button>
                        </div>
                    )
                }

                {
                    view === 'history' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                            <div className="flex items-center gap-4 mb-2"><button onClick={() => setView('home')} className="p-2 -ml-2 text-slate-400 active:scale-90"><ChevronLeft size={32} /></button><h2 className="text-2xl font-black text-slate-800 tracking-tighter">これまでのにっき</h2></div>
                            <div className="space-y-6">
                                {diaryEntries.map(entry => (
                                    <div key={entry.id} className="bg-white rounded-[2.5rem] p-8 shadow-md border border-slate-50 space-y-6 relative">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-200 mb-2 tracking-[0.15em] uppercase">{entry.date}</p>
                                            <p className="text-xl font-black text-slate-800 leading-relaxed tracking-tight">{entry.text}</p>
                                        </div>
                                        {entry.handwriting && (
                                            <div className="bg-slate-50/50 p-4 rounded-2xl shadow-inner border border-slate-100 flex flex-col gap-2">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-1 font-sans">Handwriting</span>
                                                <img src={entry.handwriting} className="w-full h-auto max-h-32 object-contain px-4" />
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                                            <button onClick={() => { setFinalSentence(entry.text); setView('result'); setUserHandwriting(entry.handwriting); }} className="w-12 h-12 bg-slate-50 text-blue-500 rounded-full flex items-center justify-center shadow-sm active:scale-90"><RotateCcw size={20} /></button>
                                            <button onClick={() => speakSentence(entry.text)} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-sm active:scale-90"><Volume2 size={24} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >

            {isProcessing && <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300"><div className="flex flex-col items-center gap-8 text-center px-10"><div className="relative"><div className="w-24 h-24 border-8 border-slate-100 rounded-full border-t-orange-500 animate-spin shadow-inner" /><div className="absolute inset-0 flex items-center justify-center text-orange-500"><Sparkles size={32} fill="currentColor" /></div></div><p className="text-2xl font-black text-slate-700 tracking-tighter animate-pulse">{statusMessage}</p></div></div>}
        </div >
    );
}

function LocalCheckCircle({ size, className }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

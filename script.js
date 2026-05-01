/* Firebase Configuration */
const firebaseConfig = {
    apiKey: "AIzaSyC-vPynNL4rdWbkYji50CyzYpIp8m0cRIs",
    authDomain: "noiresh-ai.firebaseapp.com",
    projectId: "noiresh-ai",
    storageBucket: "noiresh-ai.firebasestorage.app",
    messagingSenderId: "53985252577",
    appId: "1:53985252577:web:498197fa0f4a85bbf4d3a0",
    measurementId: "G-LR03M0LCWW"
};

const firebaseApp = firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const firebaseDb = firebase.firestore();
let firebaseAnalytics = null;
try { firebaseAnalytics = firebase.analytics(); } catch (e) { /* analytics may not work on file:// */ }

// Removed unused APP_SECRET to avoid security leak warnings on public repos.

/* Global State */
let currentQuestions = [];
let editingQuestionId = null;

let studentExamState = {
    active: false,
    examId: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    questionStartTime: null,
    intervalId: null,
    warnings: 0,
    passingMarks: 40,
    studentName: "Student",
    userEmail: null
};

/* Utils */
function formatDate(dateString) { return dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'; }
function getStatus(dateString) { if (!dateString) return 'Unknown'; const d = new Date(dateString); return d < new Date() ? 'Active' : 'Upcoming'; }

/* Secure Storage Wrapper */

/* Certificate */
/* Certificate Helper */
async function getCertificatePDFBlob(examTitle, score, date, studentName, studentEmail) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 850;
        const ctx = canvas.getContext('2d');

        // 1. Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 850);

        // 2. Ornamental Border
        ctx.lineWidth = 20;
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(20, 20, 1160, 810);

        ctx.lineWidth = 5;
        ctx.strokeStyle = '#d4af37';
        ctx.strokeRect(45, 45, 1110, 760);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(15, 15, 60, 20); ctx.fillRect(15, 15, 20, 60);
        ctx.fillRect(1125, 15, 60, 20); ctx.fillRect(1165, 15, 20, 60);
        ctx.fillRect(15, 815, 60, 20); ctx.fillRect(15, 775, 20, 60);
        ctx.fillRect(1125, 815, 60, 20); ctx.fillRect(1165, 775, 20, 60);

        // 3. Logo & Content
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = 'NSCH Logo (1).png';

        img.onload = () => {
            // Watermark
            ctx.save();
            ctx.globalAlpha = 0.05;
            ctx.drawImage(img, 300, 125, 600, 600);
            ctx.restore();

            // Header Logo
            ctx.drawImage(img, 536, 80, 128, 128);

            // Text
            ctx.textAlign = 'center';
            ctx.font = '900 60px "Lexend", sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.fillText('CERTIFICATE', 600, 260);

            ctx.font = '500 24px "Lexend", sans-serif';
            ctx.fillStyle = '#d4af37';
            ctx.fillText('OF ACHIEVEMENT', 600, 295);

            ctx.font = 'italic 20px "Lexend", serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('This certificate is proudly presented to', 600, 360);

            ctx.font = 'bold 50px "Lexend", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(studentName || "Student Name", 600, 430);

            ctx.beginPath();
            ctx.moveTo(400, 450);
            ctx.lineTo(800, 450);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#e2e8f0';
            ctx.stroke();

            ctx.font = '18px "Lexend", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(studentEmail || "student@email.com", 600, 480);

            ctx.font = 'italic 24px "Lexend", serif';
            ctx.fillStyle = '#334155';
            ctx.fillText('For successfully completing the examination', 600, 540);

            ctx.font = 'bold 36px "Lexend", sans-serif';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(examTitle, 600, 590);

            // Score
            ctx.fillStyle = '#f0fdf4';
            ctx.beginPath();
            ctx.roundRect(520, 620, 160, 50, 25);
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#16a34a';
            ctx.stroke();

            ctx.font = 'bold 24px "Lexend", sans-serif';
            ctx.fillStyle = '#15803d';
            ctx.fillText(`Score: ${score}%`, 600, 653);

            // Footer
            ctx.font = 'italic 18px "Lexend", serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`Awarded on ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 600, 750);

            ctx.font = '12px "Lexend", sans-serif';
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`ID: ${Date.now().toString(36).toUpperCase()}`, 600, 770);

            // Generate Blob
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', 0, 0, 1200, 850);
            resolve(pdf.output('blob'));
        };
        img.onerror = (e) => reject(e);
    });
}

window.generateCertificate = async (t, s, d, n, e) => {
    const btn = event.currentTarget;
    if (btn) { btn.disabled = true; btn.dataset.original = btn.innerHTML; btn.innerHTML = `<span class="animate-spin material-symbols-outlined text-sm">progress_activity</span> Generating...`; }

    try {
        const blob = await getCertificatePDFBlob(t, s, d, n, e);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeStudentName = (n || "Student").replace(/[^a-z0-9]/gi, '_').toLowerCase();

        a.download = `${safeStudentName}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Cert Gen Error", err);
        alert("Could not generate certificate. Please check console.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.original; }
    }
};

window.shareCertificate = async (t, s, d, n, e) => {
    const btn = event.currentTarget;
    if (btn) { btn.disabled = true; btn.dataset.original = btn.innerHTML; btn.innerHTML = `<span class="animate-spin material-symbols-outlined text-sm">progress_activity</span> Preparing...`; }

    try {
        const blob = await getCertificatePDFBlob(t, s, d, n, e);
        const safeStudentName = (n || "Student").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const file = new File([blob], `${safeStudentName}_certificate.pdf`, { type: "application/pdf" });

        const shareData = {
            title: 'Certificate of Achievement',
            text: `${n} has completed ${t} exam on Nitin Shrimali's Cyber Hygiene portal`,
            files: [file]
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            alert("Your device doesn't support direct file sharing. The certificate will be downloaded instead.");
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeStudentName}_Certificate.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        // AbortError is common if user cancels share
        if (err.name !== 'AbortError') {
            console.error("Share Error", err);
            alert("Sharing failed. Try downloading instead.");
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.original; }
    }
};

/* Result Screen Logic Update */
async function finishExam(forced) {
    studentExamState.active = false; document.exitFullscreen().catch(() => { });
    let c = 0; studentExamState.questions.forEach(q => {
        const ans = studentExamState.answers[q.id];
        if (ans && (typeof ans === 'object' ? ans.val : ans) === q.correct_option) c++;
    });
    let pct = Math.round((c / studentExamState.questions.length) * 100); let pass = pct >= studentExamState.passingMarks;

    await DataService.saveResult({
        exam_id: studentExamState.examId,
        score: pct,
        passed: pass,
        user_email: studentExamState.userEmail,
        studentName: studentExamState.studentName,
        answers: studentExamState.answers,
        created_at: new Date().toISOString()
    });

    const t = (await DataService.getExams()).find(e => e.id == studentExamState.examId).title;
    const email = studentExamState.userEmail;

    document.getElementById('exam-questions-container').innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center animate-fade-in">
        <div class="mb-6">
            ${pass ?
            `<div class="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-green-600 shadow-lg shadow-green-200">
                    <span class="material-symbols-outlined text-5xl notranslate">emoji_events</span>
                </div>` :
            `<div class="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600 shadow-lg shadow-red-200">
                    <span class="material-symbols-outlined text-5xl notranslate">sentiment_dissatisfied</span>
                </div>`
        }
            <h2 class="text-4xl font-black ${pass ? 'text-slate-800' : 'text-slate-800'} mb-2">${forced ? 'TERMINATED' : pass ? 'Exam Passed!' : 'Exam Failed'}</h2>
            <p class="text-slate-500 font-medium text-lg">${pass ? 'You have successfully completed the assessment.' : 'You did not meet the passing criteria.'}</p>
        </div>
        
        <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-sm mb-8">
            <div class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Your Score</div>
            <div class="text-7xl font-black ${pass ? 'text-green-500' : 'text-red-500'} mb-2">${pct}%</div>
            <div class="text-xs font-bold text-slate-400">Passing Score: ${studentExamState.passingMarks}%</div>
        </div>

        <div class="flex gap-4">
            <button onclick="window.location.reload()" class="px-8 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Return Home</button>
            ${pass ? `<button onclick="generateCertificate('${t}',${pct},'${new Date().toISOString()}','${studentExamState.studentName}', '${studentExamState.userEmail}')" class="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-transform flex items-center gap-2">
                <span class="material-symbols-outlined notranslate">download</span> Download Certificate
            </button>` : ''} 
        </div>
    </div>`;
}


/* Analog Clock */
function renderAnalogClock(id) {
    const c = document.getElementById(id); if (!c) return; const ctx = c.getContext("2d"); let r = c.height / 2; ctx.translate(r, r); r = r * 0.9;
    function draw() {
        if (!document.getElementById(id)) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.translate(c.width / 2, c.height / 2);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, 2 * Math.PI); ctx.fillStyle = 'white'; ctx.fill(); ctx.strokeStyle = '#135bec'; ctx.lineWidth = r * 0.05; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, 2 * Math.PI); ctx.fillStyle = '#333'; ctx.fill();
        ctx.font = r * 0.15 + "px arial"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
        for (let n = 1; n < 13; n++) { let a = n * Math.PI / 6; ctx.rotate(a); ctx.translate(0, -r * 0.85); ctx.rotate(-a); ctx.fillStyle = "#333"; ctx.fillText(n.toString(), 0, 0); ctx.rotate(a); ctx.translate(0, r * 0.85); ctx.rotate(-a); }
        const now = new Date(); let h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
        h = (h * Math.PI / 6) + (m * Math.PI / (6 * 60)) + (s * Math.PI / (360 * 60)); drawHand(ctx, h, r * 0.5, r * 0.07);
        m = (m * Math.PI / 30) + (s * Math.PI / (30 * 60)); drawHand(ctx, m, r * 0.8, r * 0.07);
        s = (s * Math.PI / 30); drawHand(ctx, s, r * 0.9, r * 0.02, "red"); ctx.restore(); requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}
function drawHand(ctx, pos, len, w, c = "black") { ctx.beginPath(); ctx.lineWidth = w; ctx.lineCap = "round"; ctx.strokeStyle = c; ctx.moveTo(0, 0); ctx.rotate(pos); ctx.lineTo(0, -len); ctx.stroke(); ctx.rotate(-pos); }

/* DATA SERVICE - FIREBASE FIRESTORE BACKEND */
const DataService = {
    async init() {
        if (typeof firebase !== 'undefined' && firebaseDb) {
            return true;
        } else {
            console.error("Firebase SDK not loaded");
            return false;
        }
    },

    async refreshUI() {
        if (document.getElementById('admin-dashboard-container')) {
            const isEditorOpen = !document.getElementById('question-editor-section').classList.contains('hidden');
            const isStudentsOpen = !document.getElementById('section-students').classList.contains('hidden');
            const isExamsOpen = !document.getElementById('section-exams').classList.contains('hidden');

            if (isEditorOpen) {
                const eid = document.getElementById('exam-select').value;
                if (eid) await renderQuestions(eid);
            } else {
                if (isExamsOpen) await renderAdminExams();
                if (isStudentsOpen) await renderStudentManagement();
            }
        }
        else if (document.getElementById('section-student-dashboard')) {
            await renderStudentExams();
        }
    },

    async getExams() {
        try {
            const snapshot = await firebaseDb.collection('exams').orderBy('date_time', 'asc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('getExams', error);
            return [];
        }
    },

    async createExam(d) {
        try {
            const docRef = await firebaseDb.collection('exams').add({
                ...d,
                created_at: new Date().toISOString()
            });
            this.refreshUI();
            return docRef.id;
        } catch (error) {
            console.error('createExam', error);
            alert('Error creating exam: ' + error.message);
            return null;
        }
    },

    async deleteExam(id) {
        try {
            // Delete associated questions first
            const questionsSnapshot = await firebaseDb.collection('questions').where('exam_id', '==', id).get();
            const batch = firebaseDb.batch();
            questionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(firebaseDb.collection('exams').doc(id));
            await batch.commit();
            this.refreshUI();
        } catch (error) {
            console.error('deleteExam', error);
        }
    },

    async getQuestions(eid) {
        if (!eid) return [];
        try {
            const snapshot = await firebaseDb.collection('questions').where('exam_id', '==', eid).orderBy('created_at', 'asc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            // Fallback: if composite index not ready, query without orderBy and sort client-side
            if (error.code === 'failed-precondition') {
                console.warn('getQuestions: Index not ready, falling back to client-side sort');
                const snapshot = await firebaseDb.collection('questions').where('exam_id', '==', eid).get();
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return docs.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
            }
            console.error('getQuestions', error);
            return [];
        }
    },

    async getAllQuestions() {
        try {
            const snapshot = await firebaseDb.collection('questions').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('getAllQuestions', error);
            return [];
        }
    },

    async addQuestion(q) {
        try {
            const { id, ...rest } = q;
            await firebaseDb.collection('questions').add({
                ...rest,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('addQuestion', error);
        }
    },

    async updateQuestion(id, u) {
        try {
            await firebaseDb.collection('questions').doc(id).update(u);
        } catch (error) {
            console.error('updateQuestion', error);
        }
    },

    async deleteQuestion(id) {
        try {
            await firebaseDb.collection('questions').doc(id).delete();
        } catch (error) {
            console.error('deleteQuestion', error);
        }
    },

    async deleteAllQuestions(eid) {
        try {
            const snapshot = await firebaseDb.collection('questions').where('exam_id', '==', eid).get();
            const batch = firebaseDb.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch (error) {
            console.error('deleteAllQuestions', error);
        }
    },

    async saveResult(r) {
        try {
            const dbRecord = {
                exam_id: r.exam_id,
                score: r.score,
                passed: r.passed,
                user_email: r.user_email,
                student_name: r.studentName,
                answers: r.answers,
                created_at: new Date().toISOString()
            };
            await firebaseDb.collection('exam_results').add(dbRecord);
        } catch (error) {
            console.error('saveResult', error);
        }
    },

    async getResults(eid) {
        try {
            let query = firebaseDb.collection('exam_results');
            if (eid) query = query.where('exam_id', '==', eid);
            const snapshot = await query.get();
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    studentName: data.student_name
                };
            });
        } catch (error) {
            console.error('getResults', error);
            return [];
        }
    },

    async resetStudentProgress(email) {
        try {
            const snapshot = await firebaseDb.collection('exam_results').where('user_email', '==', email).get();
            const batch = firebaseDb.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            this.refreshUI();
        } catch (error) {
            console.error('resetProgress', error);
        }
    },

    async updateStudentName(email, newName) {
        try {
            const snapshot = await firebaseDb.collection('exam_results').where('user_email', '==', email).get();
            const batch = firebaseDb.batch();
            snapshot.docs.forEach(doc => batch.update(doc.ref, { student_name: newName }));
            await batch.commit();
            this.refreshUI();
        } catch (error) {
            console.error('updateStudentName', error);
        }
    }
};

/* Start App */
document.addEventListener('DOMContentLoaded', async () => {
    await DataService.init();

    // Auth State Listener (Firebase handles redirects & session persistence automatically)
    firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in - check admin bypass first
            const adminBypass = localStorage.getItem('NSCH_ADMIN_BYPASS');
            if (adminBypass) {
                handleLoginSuccess({
                    email: localStorage.getItem('NSCH_ADMIN_EMAIL') || 'nsch1930@gmail.com',
                    user_metadata: { full_name: 'Administrator' }
                });
            } else {
                handleLoginSuccess({
                    email: user.email,
                    user_metadata: {
                        full_name: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                        avatar_url: user.photoURL
                    }
                });
            }
        } else {
            // User is signed out
            const adminBypass = localStorage.getItem('NSCH_ADMIN_BYPASS');
            if (adminBypass) {
                handleLoginSuccess({
                    email: localStorage.getItem('NSCH_ADMIN_EMAIL') || 'nsch1930@gmail.com',
                    user_metadata: { full_name: 'Administrator' }
                });
            } else {
                document.getElementById('auth-container').classList.remove('hidden');
                document.getElementById('app-container').classList.add('hidden');
                const translateWidget = document.getElementById('google_translate_element');
                const authHolder = document.getElementById('auth-translate-holder');
                if (translateWidget && authHolder) {
                    translateWidget.classList.add('auth-translate-hidden');
                    authHolder.appendChild(translateWidget);
                }
            }
        }
    });

    // Init Admin
    if (document.getElementById('admin-dashboard-container')) initAdminDashboard();
});

/* AUTH LOGIC */
// Directly open Google Translate's native language dropdown
window.openGoogleTranslate = () => {
    const el = document.getElementById('google_translate_element');
    if (!el) return;
    // Google Translate renders either a .goog-te-gadget-simple (SIMPLE layout) or a select.goog-te-combo
    const gadget = el.querySelector('.goog-te-gadget-simple');
    if (gadget) {
        gadget.click();
        return;
    }
    const combo = el.querySelector('select.goog-te-combo');
    if (combo) {
        combo.focus();
        combo.click();
        // Dispatch a mousedown event to open the native select dropdown
        combo.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }
};

let authMode = 'login';
window.switchAuth = (mode) => {
    authMode = mode;
    document.getElementById('tab-login').className = mode === 'login' ? 'flex-1 py-2 text-sm font-bold rounded-md bg-white text-primary shadow-sm transition-all' : 'flex-1 py-2 text-sm font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all';
    document.getElementById('tab-signup').className = mode === 'signup' ? 'flex-1 py-2 text-sm font-bold rounded-md bg-white text-primary shadow-sm transition-all' : 'flex-1 py-2 text-sm font-bold rounded-md text-slate-500 hover:text-slate-700 transition-all';
    document.getElementById('btn-auth').innerText = mode === 'login' ? 'Sign In' : 'Create Account';
    document.getElementById('auth-error').classList.add('hidden');
};

const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        const btn = document.getElementById('btn-auth');
        const errEl = document.getElementById('auth-error');

        btn.disabled = true; btn.innerText = "Processing..."; errEl.classList.add('hidden');

        try {
            if (authMode === 'signup') {
                await firebaseAuth.createUserWithEmailAndPassword(email, pass);
                alert("Registration successful! You are now logged in.");
            } else {
                await firebaseAuth.signInWithEmailAndPassword(email, pass);
                
                // Admin check without leaking password
                const adminEmails = ['campushub13@gmail.com', 'nsch1930@gmail.com'];
                if (adminEmails.includes(email)) {
                    localStorage.setItem('NSCH_ADMIN_BYPASS', 'true');
                    localStorage.setItem('NSCH_ADMIN_EMAIL', email);
                    window.location.href = 'admin.html';
                    return;
                }
                
                // onAuthStateChanged will handle the rest for normal users
            }
        } catch (err) {
            errEl.innerText = err.message;
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false; btn.innerText = authMode === 'login' ? 'Sign In' : 'Create Account';
        }
    });
}

const btnGoogle = document.getElementById('btn-google');
const disclaimerModal = document.getElementById('privacy-disclaimer-modal');
const btnAcceptDisclaimer = document.getElementById('btn-accept-disclaimer');

if (btnGoogle && disclaimerModal && btnAcceptDisclaimer) {
    btnGoogle.addEventListener('click', () => {
        // [SAFETY CHECK] Prevent Google Login on file:// protocol
        // Google OAuth does not support file:// redirects, causing the "localhost" error.
        if (window.location.protocol === 'file:') {
            alert("⚠️ Feature Not Available in File Mode\n\nGoogle Sign-In requires a live web server (http/https) to handle secure redirects.\n\nOptions:\n1. Use Email/Password Login (Works in File Mode)\n2. Run 'npx serve' in your terminal to enable Google Login");
            return;
        }

        // Show Modal
        disclaimerModal.classList.remove('hidden');
        // Small delay to allow display:block to apply before opacity transition
        setTimeout(() => {
            disclaimerModal.classList.remove('opacity-0');
            disclaimerModal.querySelector('div').classList.remove('scale-95');
            disclaimerModal.querySelector('div').classList.add('scale-100');
        }, 10);
    });

    btnAcceptDisclaimer.addEventListener('click', async () => {
        const originalText = btnAcceptDisclaimer.innerHTML;
        try {
            // Change button state
            btnAcceptDisclaimer.disabled = true;
            btnAcceptDisclaimer.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span> Signing in...`;

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            await firebaseAuth.signInWithPopup(provider);
            // onAuthStateChanged will handle the rest

            // Hide modal on success
            disclaimerModal.classList.add('opacity-0');
            disclaimerModal.querySelector('div').classList.remove('scale-100');
            disclaimerModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => disclaimerModal.classList.add('hidden'), 300);
        } catch (err) {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error("Google Login Error:", err);
                const errEl = document.getElementById('auth-error');
                if (errEl) {
                    errEl.innerText = err.message;
                    errEl.classList.remove('hidden');
                }
            }
            // Reset modal if error
            btnAcceptDisclaimer.disabled = false;
            btnAcceptDisclaimer.innerHTML = originalText;

            // Hide modal
            disclaimerModal.classList.add('opacity-0');
            disclaimerModal.querySelector('div').classList.remove('scale-100');
            disclaimerModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => disclaimerModal.classList.add('hidden'), 300);
        }
    });

    // Close modal if clicked outside
    disclaimerModal.addEventListener('click', (e) => {
        if (e.target === disclaimerModal) {
            disclaimerModal.classList.add('opacity-0');
            disclaimerModal.querySelector('div').classList.remove('scale-100');
            disclaimerModal.querySelector('div').classList.add('scale-95');
            setTimeout(() => disclaimerModal.classList.add('hidden'), 300);
        }
    });
}

function handleLoginSuccess(user) {
    const ac = document.getElementById('auth-container');
    if (ac) ac.classList.add('hidden');
    const appc = document.getElementById('app-container');
    if (appc) appc.classList.remove('hidden');

    const translateWidget = document.getElementById('google_translate_element');
    const sidebarHolder = document.getElementById('sidebar-translate-holder');
    if (translateWidget && sidebarHolder) {
        translateWidget.classList.remove('auth-translate-hidden');
        sidebarHolder.appendChild(translateWidget);
    }

    // Extract User Details from Google/Firebase Metadata
    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'User');
    const avatarUrl = meta.avatar_url || meta.picture;

    // Update Name Display
    const nameEl = document.getElementById('user-email');
    if (nameEl) {
        nameEl.innerText = fullName;
        nameEl.title = user.email; // Show email on hover
    }

    // Update Avatar
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        if (avatarUrl) {
            avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm">`;
            avatarEl.classList.remove('bg-slate-100', 'dark:bg-slate-700'); // Clean cleanup
        } else {
            avatarEl.innerText = fullName.charAt(0).toUpperCase();
        }
    }

    studentExamState.studentName = fullName;
    studentExamState.userEmail = user.email;

    // Show admin panel link for admin users
    const adminEmails = ['campushub13@gmail.com', 'nsch1930@gmail.com'];
    const adminNav = document.getElementById('nav-admin-panel');
    if (adminNav && adminEmails.includes(user.email)) {
        adminNav.classList.remove('hidden');
        adminNav.classList.add('flex');
    }

    renderStudentExams();
}

window.logout = async () => {
    localStorage.removeItem('NSCH_ADMIN_BYPASS');
    localStorage.removeItem('NSCH_ADMIN_EMAIL');
    await firebaseAuth.signOut();
    window.location.href = 'index.html';
};

/* ADMIN DASHBOARD */
/* ADMIN DASHBOARD */
async function initAdminDashboard() {
    await renderAdminExams();

    // Checkbox Logic for Preset
    ['easy', 'medium', 'hard'].forEach(level => {
        const cb = document.getElementById(`preset-${level}`);
        const inp = document.getElementById(`count-${level}`);
        if (cb && inp) {
            cb.addEventListener('change', () => {
                inp.disabled = !cb.checked;
                if (cb.checked) inp.focus();
            });
        }
    });

    // Sample Download
    window.downloadSampleJSON = () => {
        const sample = {
            "easy": [
                { "question": "Sample Question 1?", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "Option A" }
            ],
            "medium": [],
            "hard": []
        };
        const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "sample_question_set.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const createForm = document.getElementById('create-exam-form');
    if (createForm) {
        createForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerText = "Creating..."; btn.disabled = true;

            try {
                // 1. Create Exam Record
                const examData = {
                    title: document.getElementById('exam-title').value,
                    course_code: document.getElementById('course-code').value,
                    duration: parseInt(document.getElementById('exam-duration').value),
                    date_time: new Date(document.getElementById('exam-date').value).toISOString(),
                    passing_marks: parseInt(document.getElementById('passing-marks').value || 40),
                    status: 'Upcoming'
                };

                // We need the new ID - Firebase returns it from .add()
                const docRef = await firebaseDb.collection('exams').add({
                    ...examData,
                    created_at: new Date().toISOString()
                });

                const newExamId = docRef.id;

                // 2. Import Questions if Preset selected
                const usePreset = document.querySelector('input[name="use_preset"]:checked').value === 'yes';

                if (usePreset) {
                    btn.innerText = "Importing Questions...";

                    const counts = {
                        easy: document.getElementById('preset-easy').checked ? parseInt(document.getElementById('count-easy').value || 0) : 0,
                        medium: document.getElementById('preset-medium').checked ? parseInt(document.getElementById('count-medium').value || 0) : 0,
                        hard: document.getElementById('preset-hard').checked ? parseInt(document.getElementById('count-hard').value || 0) : 0
                    };

                    if (counts.easy > 0 || counts.medium > 0 || counts.hard > 0) {
                        try {
                            // DETERMINE SOURCE: File or Default
                            let questionSet;
                            const fileInput = document.getElementById('custom-json-file');

                            if (fileInput && fileInput.files.length > 0) {
                                const file = fileInput.files[0];
                                const text = await file.text();
                                questionSet = JSON.parse(text);
                            } else {
                                const response = await fetch('set.json');
                                if (!response.ok) throw new Error("Failed to load default set");
                                questionSet = await response.json();
                            }

                            let questionsToAdd = [];

                            // Helper to pick random
                            const pickRandom = (arr, n) => {
                                if (!arr || arr.length === 0) return [];
                                const shuffled = [...arr].sort(() => 0.5 - Math.random());
                                return shuffled.slice(0, n);
                            };

                            // Normalize question set to { easy, medium, hard }
                            // Support both formats:
                            //   Format 1 (sections): { sections: [{ questions: [...] }] }
                            //   Format 2 (direct):   { easy: [...], medium: [...], hard: [...] }
                            let normalizedSet = { easy: [], medium: [], hard: [] };

                            if (questionSet.sections && Array.isArray(questionSet.sections)) {
                                // Sections-based format: distribute sections into difficulty buckets
                                const allSections = questionSet.sections;
                                const totalSections = allSections.length;
                                const easyEnd = Math.ceil(totalSections / 3);
                                const medEnd = Math.ceil((totalSections * 2) / 3);

                                allSections.forEach((section, idx) => {
                                    const qs = section.questions || [];
                                    if (idx < easyEnd) normalizedSet.easy.push(...qs);
                                    else if (idx < medEnd) normalizedSet.medium.push(...qs);
                                    else normalizedSet.hard.push(...qs);
                                });
                            } else {
                                // Direct easy/medium/hard format
                                normalizedSet.easy = questionSet.easy || [];
                                normalizedSet.medium = questionSet.medium || [];
                                normalizedSet.hard = questionSet.hard || [];
                            }

                            const mapToDB = (qList, count) => {
                                const picked = pickRandom(qList, count);
                                picked.forEach(q => {
                                    let optA, optB, optC, optD, correctChar;

                                    if (Array.isArray(q.options)) {
                                        // Array format: ["opt1", "opt2", "opt3", "opt4"]
                                        optA = q.options[0];
                                        optB = q.options[1];
                                        optC = q.options[2];
                                        optD = q.options[3];
                                        const correctIdx = q.options.findIndex(opt => opt === q.answer);
                                        correctChar = ['A', 'B', 'C', 'D'][correctIdx !== -1 ? correctIdx : 0];
                                    } else {
                                        // Object format: { "A": "opt1", "B": "opt2", ... }
                                        optA = q.options.A || q.options.a || '';
                                        optB = q.options.B || q.options.b || '';
                                        optC = q.options.C || q.options.c || '';
                                        optD = q.options.D || q.options.d || '';
                                        // Answer is already a letter like "A", "B", "C", "D"
                                        correctChar = (q.answer || 'A').toUpperCase();
                                    }

                                    questionsToAdd.push({
                                        exam_id: newExamId,
                                        question_text: q.question,
                                        option_a: optA,
                                        option_b: optB,
                                        option_c: optC,
                                        option_d: optD,
                                        correct_option: correctChar,
                                        created_at: new Date().toISOString()
                                    });
                                });
                            };

                            if (counts.easy > 0) mapToDB(normalizedSet.easy, counts.easy);
                            if (counts.medium > 0) mapToDB(normalizedSet.medium, counts.medium);
                            if (counts.hard > 0) mapToDB(normalizedSet.hard, counts.hard);

                            if (questionsToAdd.length > 0) {
                                // Firestore batch write (max 500 per batch)
                                const batch = firebaseDb.batch();
                                questionsToAdd.forEach(qData => {
                                    const qRef = firebaseDb.collection('questions').doc();
                                    batch.set(qRef, qData);
                                });
                                await batch.commit();
                            }

                        } catch (err) {
                            console.error("Import Error", err);
                            alert("Exam created, but failed to import questions: " + err.message);
                        }
                    }
                }

                await DataService.refreshUI();
                document.getElementById('create-exam-modal').classList.add('hidden');
                e.target.reset();

                // For manual entry, auto-open the question editor
                if (!usePreset) {
                    window.selectExamForEdit(newExamId);
                }

            } catch (err) {
                console.error('createExam', err);
                alert('Error creating exam: ' + err.message);
            } finally {
                btn.innerText = "Create Exam"; btn.disabled = false;
            }
        };
    }

    const addQForm = document.getElementById('add-question-form');
    if (addQForm) {
        addQForm.onsubmit = async (e) => {
            e.preventDefault();
            const examId = document.getElementById('exam-select').value;
            if (!examId) return;
            const qData = {
                exam_id: examId,
                question_text: document.getElementById('q-text').value,
                option_a: document.getElementById('op-a').value,
                option_b: document.getElementById('op-b').value,
                option_c: document.getElementById('op-c').value,
                option_d: document.getElementById('op-d').value,
                correct_option: document.getElementById('correct-op').value
            };
            if (editingQuestionId) await DataService.updateQuestion(editingQuestionId, qData);
            else await DataService.addQuestion(qData);

            // Critical
            resetQuestionForm();
            await renderQuestions(examId);
        };
    }
}

// ADMIN NAVIGATION & STUDENTS SECTION
window.switchAdminTab = (tab) => {
    document.getElementById('section-exams').classList.toggle('hidden', tab !== 'exams');
    document.getElementById('section-students').classList.toggle('hidden', tab !== 'students');
    document.getElementById('nav-exams').className = tab === 'exams' ? 'px-4 py-1.5 rounded-md text-sm font-bold bg-white dark:bg-slate-700 shadow-sm transition-all text-primary' : 'px-4 py-1.5 rounded-md text-sm font-bold text-slate-500 hover:text-slate-700 transition-all';
    document.getElementById('nav-students').className = tab === 'students' ? 'px-4 py-1.5 rounded-md text-sm font-bold bg-white dark:bg-slate-700 shadow-sm transition-all text-primary' : 'px-4 py-1.5 rounded-md text-sm font-bold text-slate-500 hover:text-slate-700 transition-all';
    if (tab === 'students') renderStudentManagement();
    if (tab === 'exams') renderAdminExams();
};

async function renderStudentManagement() {
    const tbody = document.getElementById('student-list-body');
    const allResults = await DataService.getResults(null);
    const studentsMap = {};
    allResults.forEach(r => {
        const email = r.user_email || 'unknown@student.com';
        if (!studentsMap[email]) studentsMap[email] = { email: email, name: r.studentName || 'Student', assessments: 0, totalScore: 0 };
        studentsMap[email].assessments++; studentsMap[email].totalScore += r.score;
    });

    const students = Object.values(studentsMap);
    if (students.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400">No student data found.</td></tr>'; return; }

    tbody.innerHTML = students.map(s => {
        const initial = s.email && s.email.length > 0 ? s.email[0].toUpperCase() : '?';
        return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 last:border-0">
            <td class="p-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">${initial}</div><div><div class="font-bold text-sm cursor-pointer hover:text-primary hover:underline" onclick="editStudentName('${s.email}','${s.name}')" title="Rename">${s.name}</div><div class="text-[10px] text-slate-400">${s.email}</div></div></div></td>
            <td class="p-4 text-sm font-bold text-slate-600">${s.assessments} Exams</td>
            <td class="p-4 text-sm font-bold ${Math.round(s.totalScore / s.assessments) >= 40 ? 'text-green-600' : 'text-orange-500'}">${Math.round(s.totalScore / s.assessments)}%</td>
            <td class="p-4 text-right"><button onclick="resetStudentProgress('${s.email}')" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 font-bold border border-red-100">Reset Progress</button></td>
        </tr>`
    }).join('');
}

window.resetStudentProgress = async (email) => {
    if (confirm(`Reset all progress for ${email}?`)) {
        await DataService.resetStudentProgress(email);
    }
};

window.editStudentName = async (email, currentName) => {
    const newName = prompt(`Rename student (${email}):`, currentName);
    if (newName && newName !== currentName) {
        await DataService.updateStudentName(email, newName);
    }
};

async function renderAdminExams() {
    const grid = document.getElementById('admin-exam-grid');
    if (!grid) return;
    const exams = await DataService.getExams();
    const select = document.getElementById('exam-select');

    // Only update select if it's NOT the active element to prevent losing state
    const activeVal = select ? select.value : '';
    if (select) select.innerHTML = '<option value="">Select Exam</option>' + exams.map(e => `<option value="${e.id}">${e.title}</option>`).join('');
    if (select && activeVal && exams.find(e => e.id == activeVal)) select.value = activeVal;

    if (exams.length === 0) {
        grid.innerHTML = '<p class="text-center col-span-full py-10 text-slate-400">No Exams Created.</p>';
        return;
    }

    grid.innerHTML = exams.map(e => `
        <div class="bg-white dark:bg-[#1a2235] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative group">
             <div class="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="window.viewAnalytics('${e.id}', '${e.title}')" title="Results" class="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"><span class="material-symbols-outlined text-sm notranslate">bar_chart</span></button>
                 <button onclick="event.stopPropagation(); window.deleteExam('${e.id}')" class="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"><span class="material-symbols-outlined text-sm notranslate">delete</span></button>
            </div>
            <div onclick="window.selectExamForEdit('${e.id}')" class="cursor-pointer">
                <h3 class="font-bold text-lg text-slate-900 dark:text-white">${e.title}</h3>
                <p class="text-xs text-slate-500 mb-4">${e.course_code}</p>
                <div class="flex justify-between items-center text-xs text-slate-400 border-t pt-4 border-slate-100 dark:border-slate-700">
                    <div class="flex flex-col gap-1">
                        <span>${formatDate(e.date_time)}</span>
                        <span class="font-bold text-primary">Total Live: ${e.duration || 0} mins</span>
                    </div>
                    <span class="font-bold text-green-600">${e.passing_marks || 40}% Pass</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Admin Helpers
window.deleteExam = async (id) => { if (confirm('Delete Exam?')) await DataService.deleteExam(id); };

window.viewAnalytics = async (examId, title) => {
    const results = await DataService.getResults(examId);
    let modal = document.getElementById('results-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'results-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 hidden';
        modal.innerHTML = `
            <div class="bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden h-[85vh] flex flex-col">
                <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 class="font-bold text-lg" id="res-modal-title">Exam Results</h3>
                    <button onclick="document.getElementById('results-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><span class="material-symbols-outlined notranslate">close</span></button>
                </div>
                <div class="flex-1 overflow-y-auto p-0 relative">
                    <div id="results-list-view" class="w-full">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                                <tr>
                                    <th class="p-4 text-xs font-bold uppercase text-slate-500">Student</th>
                                    <th class="p-4 text-xs font-bold uppercase text-slate-500">Score</th>
                                    <th class="p-4 text-xs font-bold uppercase text-slate-500">Status</th>
                                    <th class="p-4 text-xs font-bold uppercase text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="res-table-body" class="divide-y divide-slate-100 dark:divide-slate-800"></tbody>
                        </table>
                    </div>
                    <div id="student-detail-view" class="absolute inset-0 bg-white dark:bg-[#1a2235] z-20 hidden flex flex-col">
                         <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <button onclick="document.getElementById('student-detail-view').classList.add('hidden')" class="text-sm font-bold flex items-center gap-2 text-slate-600 hover:text-primary"><span class="material-symbols-outlined text-sm notranslate">arrow_back</span> Back to List</button>
                            <h4 class="font-bold" id="detail-student-name">Student Attempt</h4>
                            <button onclick="window.downloadStudentReport()" class="bg-primary text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"><span class="material-symbols-outlined text-sm notranslate">download</span> Report</button>
                         </div>
                         <div class="flex-1 overflow-y-auto p-6" id="detail-content"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('res-modal-title').innerText = `Results: ${title}`;
    document.getElementById('student-detail-view').classList.add('hidden');
    const tbody = document.getElementById('res-table-body');
    modal.classList.remove('hidden');
    if (results.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">No students have taken this exam yet.</td></tr>'; return; }
    tbody.innerHTML = results.map(r => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 group">
            <td class="p-4 text-sm text-slate-700 dark:text-slate-200">
                <div class="font-bold">${r.studentName || 'Student'}</div>
                <div class="text-xs text-slate-400">${r.user_email || 'Unknown'}</div>
            </td>
            <td class="p-4 font-bold ${r.passed ? 'text-green-600' : 'text-red-500'}">${r.score}%</td>
            <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${r.passed ? 'PASS' : 'FAIL'}</span></td>
            <td class="p-4 text-right"><button onclick='window.openStudentDetail("${r.id}")' class="text-primary font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded">View Attempt</button></td>
        </tr>`).join('');
};

window.openStudentDetail = async (resultId) => {
    const allResults = await DataService.getResults(null);
    const result = allResults.find(r => r.id === resultId);
    if (!result) return;
    const questions = await DataService.getQuestions(result.exam_id);
    document.getElementById('student-detail-view').classList.remove('hidden');
    document.getElementById('detail-student-name').innerText = result.studentName || result.user_email;
    document.getElementById('detail-content').innerHTML = questions.map((q, i) => {
        const ansData = result.answers ? result.answers[q.id] : null;
        const selected = ansData ? (typeof ansData === 'object' ? ansData.val : ansData) : null;
        const timeVal = ansData && typeof ansData === 'object' ? ansData.time + 's' : 'N/A';
        const isCorrect = selected === q.correct_option;
        return `
        <div class="mb-6 border-b border-slate-100 pb-6 last:border-0">
            <div class="flex justify-between mb-2"><span class="text-xs font-bold text-slate-400 uppercase">Question ${i + 1}</span><span class="text-xs font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}">${isCorrect ? 'Correct' : 'Wrong'} (${timeVal})</span></div>
            <p class="font-bold text-slate-800 mb-3">${q.question_text}</p>
            <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="p-2 rounded ${selected == 'A' ? (isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-slate-50'} border ${q.correct_option == 'A' ? 'border-green-500' : ''}">A. ${q.option_a}</div>
                <div class="p-2 rounded ${selected == 'B' ? (isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-slate-50'} border ${q.correct_option == 'B' ? 'border-green-500' : ''}">B. ${q.option_b}</div>
                <div class="p-2 rounded ${selected == 'C' ? (isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-slate-50'} border ${q.correct_option == 'C' ? 'border-green-500' : ''}">C. ${q.option_c}</div>
                <div class="p-2 rounded ${selected == 'D' ? (isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200') : 'bg-slate-50'} border ${q.correct_option == 'D' ? 'border-green-500' : ''}">D. ${q.option_d}</div>
            </div>
        </div>`;
    }).join('');
};

window.downloadStudentReport = () => {
    const content = document.getElementById('detail-content').innerHTML;
    const name = document.getElementById('detail-student-name').innerText;
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`<html><head><title>Report - ${name}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-8"><h1 class="text-2xl font-bold mb-4">Exam Report: ${name}</h1>${content}<script>setTimeout(()=>window.print(), 1000)</script></body></html>`);
};

window.selectExamForEdit = async (id) => {
    document.getElementById('admin-dashboard-container').classList.add('hidden'); // Changed ID from 'admin-dashboard'
    document.getElementById('question-editor-section').classList.remove('hidden');
    const sel = document.getElementById('exam-select'); if (sel) sel.value = id;
    const exams = await DataService.getExams(); const ex = exams.find(e => e.id == id); if (ex) document.getElementById('editor-exam-title').innerText = ex.title;
    await renderQuestions(id);
};

window.closeQuestionEditor = () => {
    document.getElementById('question-editor-section').classList.add('hidden');
    document.getElementById('admin-dashboard-container').classList.remove('hidden'); // Changed ID
};

window.editQuestion = (id) => {
    editingQuestionId = id; const q = currentQuestions.find(x => x.id == id); if (!q) return;
    document.getElementById('q-text').value = q.question_text; document.getElementById('op-a').value = q.option_a; document.getElementById('op-b').value = q.option_b; document.getElementById('op-c').value = q.option_c; document.getElementById('op-d').value = q.option_d; document.getElementById('correct-op').value = q.correct_option;
    document.getElementById('btn-save-question').innerText = "Update"; document.getElementById('btn-cancel-edit').classList.remove('hidden');
};

window.deleteQuestion = async (id) => { if (confirm('Delete Question?')) { await DataService.deleteQuestion(id); const eid = document.getElementById('exam-select').value; if (eid) await renderQuestions(eid); } };
window.deleteAllQuestions = async () => {
    if (confirm('Are you ABSOLUTELY sure? This will delete ALL questions for this exam.')) {
        const eid = document.getElementById('exam-select').value;
        if (eid) { await DataService.deleteAllQuestions(eid); await renderQuestions(eid); }
    }
};

window.resetQuestionForm = () => {
    const sel = document.getElementById('exam-select');
    const currentExamId = sel ? sel.value : null;
    document.getElementById('add-question-form').reset();
    if (sel && currentExamId) sel.value = currentExamId;
    editingQuestionId = null;
    document.getElementById('btn-save-question').innerText = "Add Question";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
};

async function renderQuestions(examId) {
    currentQuestions = await DataService.getQuestions(examId);
    const results = await DataService.getResults(examId);
    const list = document.getElementById('questions-list'); document.getElementById('q-count').innerText = currentQuestions.length;
    list.innerHTML = currentQuestions.map((q, i) => {
        let wrongCount = 0; if (results.length > 0) { results.forEach(r => { const ansObj = r.answers ? r.answers[q.id] : null; const val = (typeof ansObj === 'object') ? ansObj.val : ansObj; if (val !== q.correct_option) wrongCount++; }); }
        const wrongPct = results.length ? Math.round((wrongCount / results.length) * 100) : 0;
        return `<div onclick="window.editQuestion('${q.id}')" class="p-3 bg-white dark:bg-slate-800 border rounded-lg cursor-pointer hover:border-primary relative group border-slate-200 dark:border-slate-700"><div class="flex justify-between items-start mb-1"><span class="text-xs font-bold text-slate-400">Q${i + 1}</span>${results.length > 0 ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${wrongPct > 50 ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}">${wrongPct}% Wrong</span>` : ''}</div><p class="text-sm line-clamp-2">${q.question_text}</p><button onclick="event.stopPropagation(); window.deleteQuestion('${q.id}')" class="absolute top-2 right-2 hidden group-hover:block text-red-500"><span class="material-symbols-outlined text-sm notranslate">delete</span></button></div>`;
    }).join('');
}


/* STUDENT EXAM ENGINE */
/* STUDENT EXAM ENGINE */
let examListRefreshInterval = null;

async function renderStudentExams() {
    const container = document.getElementById('exam-list-container');
    if (!container) return;

    // SKELETON LOADING UI
    container.innerHTML = Array(3).fill(0).map(() => `
        <div class="bg-white dark:bg-[#1a2235] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div class="h-4 bg-slate-100 dark:bg-slate-700 w-1/3 rounded animate-shimmer"></div>
            <div class="h-8 bg-slate-100 dark:bg-slate-700 w-3/4 rounded animate-shimmer"></div>
            <div class="flex gap-4 mt-2">
                <div class="h-10 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-shimmer"></div>
                <div class="h-10 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-shimmer"></div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                 <div class="h-10 w-full bg-slate-100 dark:bg-slate-700 rounded-xl animate-shimmer"></div>
            </div>
        </div>
    `).join('');

    // Prevent multiple intervals
    if (examListRefreshInterval) clearTimeout(examListRefreshInterval);

    const exams = await DataService.getExams();
    const allResults = await DataService.getResults(null);
    const myResults = allResults.filter(r => r.user_email === studentExamState.userEmail);
    const allQuestions = await DataService.getAllQuestions();

    // Auto-update student name
    if (myResults.length > 0 && myResults[0].studentName && myResults[0].studentName !== studentExamState.studentName) {
        studentExamState.studentName = myResults[0].studentName;
    }

    // Update Stats
    if (document.getElementById('stat-exams-taken')) {
        document.getElementById('stat-exams-taken').innerText = myResults.length;
        const avg = myResults.length ? Math.round(myResults.reduce((a, b) => a + b.score, 0) / myResults.length) : 0;
        document.getElementById('stat-avg-score').innerText = avg + '%';

        const card3 = document.querySelector('.grid-cols-1 > div:nth-child(3)');
        if (card3) {
            let status = 'New Student'; let color = 'text-purple-600'; let bg = 'bg-purple-50';
            if (myResults.length > 0) { if (avg >= 75) { status = 'Top Performer'; color = 'text-green-600'; bg = 'bg-green-50'; } else if (avg >= 40) { status = 'Good Standing'; color = 'text-blue-600'; bg = 'bg-blue-50'; } else { status = 'Needs Improvement'; color = 'text-orange-600'; bg = 'bg-orange-50'; } }
            card3.innerHTML = `<div class="w-12 h-12 rounded-full ${bg} ${color} flex items-center justify-center"><span class="material-symbols-outlined notranslate">school</span></div><div><p class="text-xs font-bold uppercase text-slate-500">Academic Status</p><h3 class="text-xl font-bold ${color}">${status}</h3></div>`;
            card3.classList.remove('opacity-50');
        }
    }

    if (exams.length == 0) { container.innerHTML = `<div class="p-12 text-center text-slate-500 col-span-full">No exams available.</div>`; return; }

    // Check for next refresh (find nearest upcoming exam)
    let nextRefresh = 30000; // Default 30s
    const now = new Date();

    container.innerHTML = exams.map(e => {
        const attempts = myResults.filter(r => r.exam_id === e.id).sort((a, b) => new Date(a.created_at || '1970') - new Date(b.created_at || '1970'));
        const passed = attempts.some(a => a.score >= (e.passing_marks || 40));
        const attemptCount = attempts.length;
        const canTake = attemptCount === 0 || (!passed && attemptCount < 2);

        const examDate = new Date(e.date_time);
        const durationMs = (e.duration || 0) * 60000;
        const endDate = new Date(examDate.getTime() + durationMs);

        let status = 'Unknown';
        if (now >= examDate && now <= endDate) {
            status = canTake ? 'Active' : 'Completed';
        } else if (now < examDate) {
            status = 'Upcoming';
        } else {
            status = (attemptCount > 0) ? 'Completed' : 'Missed';
        }

        const qCount = allQuestions.filter(q => q.exam_id === e.id).length;

        // Check time to start for auto-refresh
        if (canTake && status === 'Upcoming') {
            const timeToStart = examDate - now;
            if (timeToStart > 0 && timeToStart < nextRefresh) nextRefresh = timeToStart + 1000;
        }
        // Auto-refresh when exam ends
        if (status === 'Active') {
            const timeToEnd = endDate - now;
            if (timeToEnd > 0 && timeToEnd < nextRefresh) nextRefresh = timeToEnd + 1000;
        }

        let headerBg = 'bg-slate-100'; let btn = '';
        if (status === 'Completed') {
            headerBg = 'bg-blue-50';
            const blocks = attempts.map((a, idx) => {
                const pass = a.score >= (e.passing_marks || 40);
                return `<div class="flex flex-col items-center"><span class="text-[10px] font-bold text-slate-400 uppercase">Attempt ${idx + 1}</span><span class="text-xl font-black ${pass ? 'text-green-600' : 'text-red-500'}">${a.score}%</span></div>`;
            }).join('<div class="w-px h-8 bg-slate-200 mx-3 py-1"></div>');
            btn = `<div class="flex items-center justify-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800 w-full shadow-sm">${blocks}</div>`;
        } else if (status === 'Active') {
            headerBg = 'bg-green-50';
            const btnText = attemptCount > 0 ? "Give Exam Again" : "Start Exam";
            let prevScoreBlock = '';
            if (attemptCount > 0) {
                prevScoreBlock = `<div class="flex flex-col items-start mr-4"><span class="text-[10px] font-bold text-slate-400 uppercase leading-tight">Prev.<br>Score</span><span class="text-sm font-black text-red-500">${attempts[attemptCount - 1].score}%</span></div>`;
            }
            btn = `<div class="flex w-full items-center justify-between">${prevScoreBlock}<button onclick="window.enterWaitingRoom('${e.id}')" class="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform animate-pulse">${btnText}</button></div>`;
        } else if (status === 'Upcoming') {
            headerBg = 'bg-amber-50'; // Warmer color for upcoming
            btn = `<button disabled class="bg-slate-100 text-slate-400 w-full py-3 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2"><span class="material-symbols-outlined text-sm notranslate">lock_clock</span> Starts in ${Math.ceil((examDate - now) / 60000)}m</button>`;
        } else if (status === 'Missed') {
            headerBg = 'bg-slate-200';
            btn = `<button disabled class="bg-slate-100 text-slate-400 w-full py-3 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2"><span class="material-symbols-outlined text-sm notranslate">block</span> Deadline Missed</button>`;
        }

        const statusColors = {
            'Completed': 'bg-blue-200 text-blue-700',
            'Active': 'bg-green-200 text-green-700',
            'Upcoming': 'bg-amber-200 text-amber-800', // Better contrast
            'Missed': 'bg-slate-300 text-slate-600'
        };

        return `
        <div class="bg-white dark:bg-[#1a2235] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow flex flex-col ${status === 'Missed' ? 'opacity-70 grayscale-[0.5]' : ''}">
            <div class="${headerBg} p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-lg text-slate-900 dark:text-slate-800 leading-tight mb-1">${e.title}</h3>
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-wide">${e.course_code}</p>
                </div>
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${statusColors[status]}">${status}</span>
            </div>
            <div class="p-6 flex-1 flex flex-col gap-4">
               <div class="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                     <div class="flex-1 flex flex-col gap-1">
                        <span class="text-[10px] uppercase font-bold text-slate-400">Pass Mark</span>
                        <span class="font-bold text-slate-800 dark:text-slate-200">${e.passing_marks}%</span>
                    </div>
                </div>
                <div class="border-t border-slate-100 dark:border-slate-800 my-2"></div>
                <div class="grid grid-cols-2 gap-4 text-xs text-slate-500">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm notranslate">calendar_month</span>
                        <span>${examDate.toLocaleDateString()}</span>
                    </div>
                     <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm notranslate">schedule</span>
                        <span>${examDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                     <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm notranslate">quiz</span>
                        <span>${qCount} Questions</span>
                    </div>
                    <div></div>
                </div>
            </div>
            <div class="p-4 pt-0 mt-auto">
                ${btn}
            </div>
        </div>`;
    }).join('');

    // Schedule next check
    examListRefreshInterval = setTimeout(renderStudentExams, nextRefresh);
}

window.enterWaitingRoom = async (eid) => {
    const exams = await DataService.getExams();
    const exam = exams.find(e => e.id == eid);

    // Security Check: Is exam still active?
    const now = new Date();
    const start = new Date(exam.date_time);
    const end = new Date(start.getTime() + (exam.duration * 60000));

    if (now > end) {
        alert("Deadline Missed: This exam is no longer accepting submissions.");
        window.location.reload();
        return;
    }

    document.getElementById('secure-exam-ui').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('exam-ui-title').innerText = exam.title;

    const tick = () => {
        const now = new Date();
        if (now >= start) {
            cancelAnimationFrame(studentExamState.intervalId);
            document.getElementById('exam-questions-container').innerHTML = `<div class="flex flex-col items-center justify-center h-full animate-fade-in"><h1 class="text-4xl font-black mb-6 text-primary">Exam Started!</h1><button onclick='window.forceStart("${exam.id}")' class="bg-green-600 text-white text-2xl font-bold px-12 py-6 rounded-2xl shadow-xl hover:scale-105 transition-transform">ENTER EXAM</button><p class="mt-4 text-xs font-bold text-red-500">Fullscreen Required.</p></div>`;
        } else {
            const diff = Math.ceil((start - now) / 1000);
            const mins = Math.floor(diff / 60);
            const secs = diff % 60;
            document.getElementById('exam-questions-container').innerHTML = `<div class="flex flex-col items-center justify-center h-full"><div class="relative w-48 h-48 mb-6"><canvas id="analog-clock" width="192" height="192"></canvas></div><div class="text-4xl font-mono font-bold text-primary mb-4">${mins}:${secs < 10 ? '0' + secs : secs}</div><p class="text-slate-500">Waiting Room</p></div>`;
            renderAnalogClock('analog-clock');
            studentExamState.intervalId = requestAnimationFrame(tick);
        }
    };
    studentExamState.intervalId = requestAnimationFrame(tick);
};


function preventDefaultContextMenu(e) { e.preventDefault(); }

window.forceStart = async (eid) => {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
    const exams = await DataService.getExams(); const exam = exams.find(e => e.id == eid);
    const qs = await DataService.getQuestions(eid);

    // Randomize Questions (Fisher-Yates Shuffle)
    for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
    }

    studentExamState = { ...studentExamState, active: true, examId: eid, questions: qs, currentIndex: 0, passingMarks: exam.passing_marks || 40, warnings: 0, answers: {} };
    renderOneQuestion();

    // Secure Mode Listeners
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFS);
    document.removeEventListener('contextmenu', preventDefaultContextMenu);

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFS);
    document.addEventListener('contextmenu', preventDefaultContextMenu);
};

// Global functions
function handleBlur() {
    if (!studentExamState.active) return;
    // Debounce or check logic if needed, but immediate warning is safer for security
    triggerWarning("Window Focus Lost");
}

function handleVisibilityChange() {
    if (!studentExamState.active) return;
    if (document.hidden) {
        triggerWarning("Tab Switched / Minimized");
    }
}

function triggerWarning(reason) {
    studentExamState.warnings++;
    const container = document.getElementById('exam-questions-container');

    if (studentExamState.warnings >= 3) {
        finishExam(true);
    } else {
        // Show Warning Overlay
        const overlay = document.createElement('div');
        overlay.id = 'warning-overlay';
        overlay.className = 'fixed inset-0 z-[110] bg-red-600 flex flex-col items-center justify-center text-white animate-pulse';
        overlay.innerHTML = `
            <span class="material-symbols-outlined text-9xl mb-4 notranslate">warning</span>
            <h1 class="text-5xl font-black uppercase text-center mb-2">Warning ${studentExamState.warnings}/3</h1>
            <p class="text-xl font-bold uppercase tracking-widest mb-8">${reason}</p>
            <button onclick="document.getElementById('warning-overlay').remove()" class="bg-white text-red-600 px-12 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform uppercase">Resume Exam</button>
        `;
        document.body.appendChild(overlay);
    }
}

function handleFS() {
    if (!studentExamState.active) return;
    if (!document.fullscreenElement) {
        // Exiting fullscreen counts as a penalty
        triggerWarning("Exited Fullscreen");
        // If not yet terminated (< 3 warnings), show return prompt
        if (studentExamState.warnings < 3) {
            // Remove previous warning overlay if any
            const oldOverlay = document.getElementById('warning-overlay');
            if (oldOverlay) oldOverlay.remove();
            document.getElementById('exam-questions-container').innerHTML = `<div class="fixed inset-0 bg-red-600 flex flex-col items-center justify-center text-white z-[105]">
                <span class="material-symbols-outlined text-9xl mb-4 notranslate">gpp_bad</span>
                <h1 class="text-5xl font-black mb-4">FULLSCREEN VIOLATION</h1>
                <p class="text-2xl font-bold mb-2">Penalty ${studentExamState.warnings}/3</p>
                <p class="mb-8 font-bold text-xl opacity-80">You must stay in fullscreen during the exam.</p>
                <button onclick="document.documentElement.requestFullscreen();renderOneQuestion()" class="bg-white text-red-600 px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">Return to Exam</button>
                <p class="mt-4 text-sm opacity-60 font-bold">3 violations = automatic termination</p>
            </div>`;
        }
    }
}
window.prevQuestion = () => {
    // Attempt to save state if an answer is selected (don't force validation)
    const r = document.querySelector('input[name="cq"]:checked');
    if (r) {
        const qId = studentExamState.questions[studentExamState.currentIndex].id;
        const existing = studentExamState.answers[qId];
        const prevTime = existing ? (existing.time || 0) : 0;
        const currentSession = Math.round((Date.now() - (studentExamState.questionStartTime || Date.now())) / 1000);

        studentExamState.answers[qId] = {
            val: r.value,
            time: prevTime + currentSession
        };
    }

    if (studentExamState.currentIndex > 0) {
        studentExamState.currentIndex--;
        renderOneQuestion();
    }
};

function renderOneQuestion() {
    const q = studentExamState.questions[studentExamState.currentIndex];
    const last = studentExamState.currentIndex == studentExamState.questions.length - 1;
    const first = studentExamState.currentIndex === 0;

    // Set Time Start
    studentExamState.questionStartTime = Date.now();

    // Retrieve existing answer if available
    const existing = studentExamState.answers[q.id];
    const savedVal = existing ? (typeof existing === 'object' ? existing.val : existing) : null;

    // Stats
    const total = studentExamState.questions.length;
    const answeredCount = Object.keys(studentExamState.answers).length;
    const pending = total - answeredCount;

    document.getElementById('exam-questions-container').innerHTML = `
    <div class="max-w-2xl mx-auto h-full flex flex-col justify-center px-4 animate-fade-in">
        <div class="flex justify-between items-center mb-4">
             <div class="text-xs font-bold text-slate-400 uppercase">Question ${studentExamState.currentIndex + 1}/${total}</div>
             <div class="text-xs font-bold ${pending > 0 ? 'text-amber-500' : 'text-green-500'} uppercase bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                ${pending > 0 ? `${pending} Pending` : 'All Answered'}
             </div>
        </div>
        
        <h2 class="text-2xl font-bold mb-8 text-slate-800 dark:text-white">${q.question_text}</h2>
        <div class="grid gap-3 mb-8">
            ${['A', 'B', 'C', 'D'].map(o => {
        const checked = savedVal === o ? 'checked' : '';
        const activeClass = savedVal === o ? 'bg-slate-50 border-primary dark:bg-slate-800 dark:border-primary' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700';
        return `
                <label class="flex items-center p-4 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${activeClass}">
                    <input type="radio" name="cq" value="${o}" class="w-5 h-5 accent-primary" ${checked}>
                    <span class="ml-4 font-bold w-6 text-slate-500">${o}</span>
                    <span class="text-slate-700 dark:text-slate-300 font-medium">${q['option_' + o.toLowerCase()]}</span>
                </label>`;
    }).join('')}
        </div>
        <div class="flex gap-4">
             ${!first ? `<button onclick="prevQuestion()" class="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Previous</button>` : ''}
            <button onclick="submitAnswer(${last})" class="flex-[2] bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.95] transition-all">
                ${last ? 'Finish Exam' : (savedVal ? 'Next Question' : 'Skip & Next')}
            </button>
        </div>
    </div>`;
}

window.submitAnswer = (last) => {
    const r = document.querySelector('input[name="cq"]:checked');
    const qId = studentExamState.questions[studentExamState.currentIndex].id;

    // Time Calc
    const currentSession = Math.round((Date.now() - (studentExamState.questionStartTime || Date.now())) / 1000);
    const existing = studentExamState.answers[qId];
    const prevTime = existing ? (existing.time || 0) : 0;

    // Only save if selected
    if (r) {
        studentExamState.answers[qId] = {
            val: r.value,
            time: prevTime + currentSession
        };
    }

    if (last) {
        // Validation: Must answer all
        const total = studentExamState.questions.length;
        const answered = Object.keys(studentExamState.answers).length;
        if (answered < total) {
            const pending = total - answered;
            alert(`You still have ${pending} pending questions.\n\nYou cannot finish the exam until all questions are attempted.`);
            return;
        }
        finishExam(false);
    } else {
        studentExamState.currentIndex++;
        renderOneQuestion();
    }
};

async function finishExam(forced) {
    studentExamState.active = false; document.exitFullscreen().catch(() => { });
    let c = 0; studentExamState.questions.forEach(q => {
        const ans = studentExamState.answers[q.id];
        if (ans && (typeof ans === 'object' ? ans.val : ans) === q.correct_option) c++;
    });
    let pct = Math.round((c / studentExamState.questions.length) * 100); let pass = pct >= studentExamState.passingMarks;

    await DataService.saveResult({
        exam_id: studentExamState.examId,
        score: pct,
        passed: pass,
        user_email: studentExamState.userEmail,
        studentName: studentExamState.studentName,
        answers: studentExamState.answers,
        created_at: new Date().toISOString()
    });

    // Check attempts
    const allResults = await DataService.getResults();
    const attempts = allResults.filter(r => r.exam_id == studentExamState.examId && r.user_email == studentExamState.userEmail);
    const attemptCount = attempts.length;

    const t = (await DataService.getExams()).find(e => e.id == studentExamState.examId).title;

    // Determine buttons:
    let buttonsHtml = '';

    if (pass) {
        buttonsHtml = `
            <div class="flex flex-col md:flex-row gap-4 items-center justify-center">
                <button onclick="generateCertificate('${t}',${pct},'${new Date().toISOString()}','${studentExamState.studentName}', '${studentExamState.userEmail}')" class="bg-amber-400 px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                    <span class="material-symbols-outlined notranslate">download</span> Download Certificate
                </button>
                <button onclick="shareCertificate('${t}',${pct},'${new Date().toISOString()}','${studentExamState.studentName}', '${studentExamState.userEmail}')" class="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-400/30 hover:scale-105 transition-transform flex items-center gap-2">
                    <span class="material-symbols-outlined notranslate">share</span> Share Certificate
                </button>
            </div>`;
    } else {
        // Failed: Check if they have a chance left (1 initial + 1 retake = 2 max)
        // Actually, if they failed, allow retake if it's their 1st attempt.
        if (attemptCount < 2) {
            buttonsHtml = `
            <div class="flex flex-col gap-4 items-center justify-center">
                <p class="text-slate-500 font-bold mb-2">You have 1 retry attempt available.</p>
                <div class="flex flex-col md:flex-row gap-4 w-full justify-center">
                    <button onclick="window.location.reload()" class="bg-slate-100 text-slate-500 px-6 py-3 rounded-full font-bold shadow-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined notranslate">home</span> Dashboard
                    </button>
                    <button onclick="window.enterWaitingRoom('${studentExamState.examId}')" class="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-400/30 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 w-full md:w-auto">
                        <span class="material-symbols-outlined notranslate">refresh</span> Give Exam Again
                    </button>
                </div>
            </div>`;
        } else {
            buttonsHtml = `<p class="text-red-500 font-bold">Maximum attempts reached.</p>`;
        }
    }

    document.getElementById('exam-questions-container').innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center">
        <h2 class="text-4xl font-black ${pass ? 'text-green-600' : 'text-red-500'} mb-4">${forced ? 'TERMINATED' : pass ? 'PASSED' : 'FAILED'}</h2>
        <div class="text-6xl font-black mb-8">${pct}%</div>
        ${buttonsHtml}
        <button onclick="window.location.reload()" class="mt-8 text-slate-500 font-bold hover:text-slate-800">Return to Dashboard</button>
    </div>`;
}

window.startReassessment = async () => {
    try {
        const btn = event.target.closest('button');
        if (btn) btn.innerHTML = "Preparing Reassessment...";

        // 1. Fetch Question Set
        const res = await fetch('set.json');
        if (!res.ok) throw new Error("Could not load question bank.");
        const questionBank = await res.json();

        // Normalize to flat array from sections-based or easy/medium/hard format
        let allBankQuestions = [];
        if (questionBank.sections && Array.isArray(questionBank.sections)) {
            questionBank.sections.forEach(section => {
                (section.questions || []).forEach(q => {
                    let optA, optB, optC, optD, correctChar;
                    if (Array.isArray(q.options)) {
                        optA = q.options[0]; optB = q.options[1]; optC = q.options[2]; optD = q.options[3];
                        const idx = q.options.findIndex(o => o === q.answer);
                        correctChar = ['A', 'B', 'C', 'D'][idx !== -1 ? idx : 0];
                    } else {
                        optA = q.options.A || ''; optB = q.options.B || ''; optC = q.options.C || ''; optD = q.options.D || '';
                        correctChar = (q.answer || 'A').toUpperCase();
                    }
                    allBankQuestions.push({
                        id: 'bank_' + q.id,
                        question_text: q.question,
                        option_a: optA, option_b: optB, option_c: optC, option_d: optD,
                        correct_option: correctChar
                    });
                });
            });
        } else {
            ['easy', 'medium', 'hard'].forEach(diff => {
                (questionBank[diff] || []).forEach(q => {
                    let optA, optB, optC, optD, correctChar;
                    if (Array.isArray(q.options)) {
                        optA = q.options[0]; optB = q.options[1]; optC = q.options[2]; optD = q.options[3];
                        const idx = q.options.findIndex(o => o === q.answer);
                        correctChar = ['A', 'B', 'C', 'D'][idx !== -1 ? idx : 0];
                    } else {
                        optA = q.options.A || ''; optB = q.options.B || ''; optC = q.options.C || ''; optD = q.options.D || '';
                        correctChar = (q.answer || 'A').toUpperCase();
                    }
                    allBankQuestions.push({
                        id: 'bank_' + (q.id || Math.random()),
                        question_text: q.question,
                        option_a: optA, option_b: optB, option_c: optC, option_d: optD,
                        correct_option: correctChar
                    });
                });
            });
        }

        // 2. Analyze current exam
        const oldQuestions = studentExamState.questions;
        const oldTexts = new Set(oldQuestions.map(q => q.question_text));
        const totalNeeded = oldQuestions.length;

        // 3. Pick New Questions (prefer ones not in old set)
        let candidates = allBankQuestions.filter(q => !oldTexts.has(q.question_text));
        if (candidates.length < totalNeeded) {
            candidates = allBankQuestions; // Reuse if not enough unique
        }

        // Shuffle
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        let newQuestions = candidates.slice(0, totalNeeded);

        // Shuffle the final set
        for (let i = newQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newQuestions[i], newQuestions[j]] = [newQuestions[j], newQuestions[i]];
        }

        // 4. Reset State and Start
        studentExamState.questions = newQuestions;
        studentExamState.currentIndex = 0;
        studentExamState.answers = {};
        studentExamState.warnings = 0;
        studentExamState.questionStartTime = Date.now();
        studentExamState.active = true;

        // Enter Fullscreen
        try {
            await document.documentElement.requestFullscreen();
        } catch (e) {
            console.warn("Fullscreen request failed", e);
        }

        renderOneQuestion();

    } catch (e) {
        console.error(e);
        alert("Failed to start reassessment: " + e.message);
    }
};

// Global functions
function handleBlur() { if (!studentExamState.active) return; studentExamState.warnings++; alert(`⚠️ Focus Lost ${studentExamState.warnings}/3`); if (studentExamState.warnings >= 3) finishExam(true); }
function handleFS() { if (!studentExamState.active) return; if (!document.fullscreenElement) document.getElementById('exam-questions-container').innerHTML = '<div class="fixed inset-0 bg-red-600 flex items-center justify-center text-white"><h1 class="text-5xl font-black">RETURN TO FULLSCREEN</h1><button onclick="document.documentElement.requestFullscreen();renderOneQuestion()" class="bg-white text-red-600 px-8 py-4 rounded-full font-bold mt-8">RETURN</button></div>'; }

/* STUDENT NAVIGATION & CALENDAR */
window.switchStudentTab = (tab) => {
    document.getElementById('section-student-dashboard').classList.toggle('hidden', tab !== 'dashboard');
    document.getElementById('section-student-schedule').classList.toggle('hidden', tab !== 'schedule');

    const navDash = document.getElementById('nav-student-dashboard');
    const navSch = document.getElementById('nav-student-schedule');

    if (tab === 'dashboard') {
        navDash.className = "flex items-center gap-3 px-3 py-3 rounded-lg bg-primary text-white w-full text-left shadow-sm transition-all";
        navSch.className = "flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left transition-colors";
    } else {
        navSch.className = "flex items-center gap-3 px-3 py-3 rounded-lg bg-primary text-white w-full text-left shadow-sm transition-all";
        navDash.className = "flex items-center gap-3 px-3 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 w-full text-left transition-colors";
        renderCalendar();
    }
};

let currentCalendarDate = new Date();

window.changeCalendarMonth = (delta) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

window.selectCalendarDate = async (y, m, d) => {
    const date = new Date(y, m, d);
    document.getElementById('selected-date-title').innerText = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const container = document.getElementById('selected-date-exams');
    const exams = await DataService.getExams();
    const dayExams = exams.filter(e => {
        const eDate = new Date(e.date_time);
        return eDate.getDate() === d && eDate.getMonth() === m && eDate.getFullYear() === y;
    });

    if (dayExams.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm text-center my-auto">No exams scheduled for this day.</p>`;
        return;
    }

    container.innerHTML = dayExams.map(e => `
        <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">${new Date(e.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <h4 class="font-bold text-slate-800 dark:text-slate-200 mb-2">${e.title}</h4>
             <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatus(e.date_time) === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${getStatus(e.date_time)}</span>
        </div>
    `).join('');
};

async function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-year');
    if (!grid || !label) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const today = new Date();

    label.innerText = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const exams = await DataService.getExams();

    let html = '';

    // Empty cells for prev month
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="p-2 border border-transparent"></div>`;
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        // Find exams on this day
        const dayExams = exams.filter(e => {
            const eDate = new Date(e.date_time);
            return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
        });

        const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

        let bgClass = "hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer";
        let textClass = "text-slate-700 dark:text-slate-300";

        if (isToday) {
            bgClass = "bg-primary/10 border-primary/30";
            textClass = "text-primary font-bold";
        }

        html += `
        <div onclick="window.selectCalendarDate(${year}, ${month}, ${d})" class="p-2 min-h-[80px] rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col items-start justify-between transition-colors ${bgClass}">
            <span class="text-sm ${textClass}">${d}</span>
            <div class="flex gap-1 flex-wrap content-end w-full">
                ${dayExams.map(e => {
            let dotColor = 'bg-blue-500';
            if (new Date(e.date_time) < new Date()) dotColor = 'bg-slate-400'; // Past
            return `<div class="w-1.5 h-1.5 rounded-full ${dotColor}" title="${e.title}"></div>`;
        }).join('')}
            </div>
        </div>`;
    }

    grid.innerHTML = html;
}

window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    if (sidebar && overlay) {
        overlay.classList.toggle('hidden');
        sidebar.classList.toggle('-translate-x-full');
    }
};


// -------------------------------------------------------------------------
// NEW CERTIFICATE GENERATOR (Based on Template)
// -------------------------------------------------------------------------

// Helper to load image for certificate
const loadCertImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => {
        // Fallback for signatures if missing
        resolve(null);
    };
});

// Helper for text wrapping for certificate
function wrapCertText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
}

// Shared Canvas Generator to avoid duplication
async function generateCertificateCanvas(title, score, date, name, email) {
    const certID = Date.now().toString(36).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 850);

    // 2. Ornamental Border
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(20, 20, 1160, 810);

    ctx.lineWidth = 5;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(45, 45, 1110, 760);

    // Corner Accents
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(15, 15, 60, 20); ctx.fillRect(15, 15, 20, 60);
    ctx.fillRect(1125, 15, 60, 20); ctx.fillRect(1165, 15, 20, 60);
    ctx.fillRect(15, 815, 60, 20); ctx.fillRect(15, 775, 20, 60);
    ctx.fillRect(1125, 815, 60, 20); ctx.fillRect(1165, 775, 20, 60);

    // Load Assets
    const [logo1, logo2, sigNitin, sigVinayak] = await Promise.all([
        loadCertImage('NSCH Logo (1).png'),
        loadCertImage('campushub.jpg'),
        loadCertImage('NitinSign.png'),
        loadCertImage('VinayakSign.png')
    ]);

    if (!logo1 || !logo2) {
        throw new Error("Missing required logos (NSCH/CampusHub).");
    }

    // 3. Logos (Header) - Centered
    ctx.drawImage(logo1, 490, 60, 100, 100);
    ctx.drawImage(logo2, 610, 60, 100, 100);

    // Watermark
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.drawImage(logo1, 300, 125, 600, 600);
    ctx.restore();

    // 4. Header Text
    ctx.textAlign = 'center';
    ctx.font = '900 60px "Lexend", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('CERTIFICATE', 600, 220);

    ctx.font = '500 24px "Lexend", sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.fillText('OF ACHIEVEMENT', 600, 260);

    // 5. Presenting Line
    ctx.font = 'italic 20px "Lexend", serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('This certificate is proudly presented to', 600, 320);

    // 6. Candidate Name
    ctx.font = 'bold 50px "Lexend", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(name, 600, 390);

    // Underline
    ctx.beginPath();
    ctx.moveTo(300, 410);
    ctx.lineTo(900, 410);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();

    // 7. Body Text
    ctx.font = '400 18px "Lexend", sans-serif';
    ctx.fillStyle = '#334155';
    const bodyText1 = "for successfully clearing the Safe Netizen assessment with a qualifying score. This recognition is awarded under the Nitin Shrimali’s Cyber Hygiene (NSCH) initiative, validating the candidate's proficiency in digital defense, scam prevention, and secure online conduct.";
    const bodyText2 = "The holder is officially recognized as a proactive contributor to a safer and more secure digital ecosystem.";

    let cursorY = 460;
    cursorY = wrapCertText(ctx, bodyText1, 600, cursorY, 800, 30);
    cursorY += 20;
    wrapCertText(ctx, bodyText2, 600, cursorY, 800, 30);

    // 8. Footer Metadata
    const attemptDate = new Date(date).toLocaleDateString('en-GB');

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(200, 680, 800, 100);

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Lexend", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Date: ${attemptDate}   •   ID: ${certID}`, 600, 800);

    // Signatures
    const sigY = 660;

    if (sigNitin) {
        ctx.drawImage(sigNitin, 350, sigY, 150, 60);
    } else {
        ctx.fillStyle = '#cbd5e1'; ctx.font = 'italic 12px sans-serif'; ctx.fillText('(Nitin Sign Missing)', 425, sigY + 30);
    }

    if (sigVinayak) {
        ctx.drawImage(sigVinayak, 700, sigY, 150, 60);
    } else {
        ctx.fillStyle = '#cbd5e1'; ctx.font = 'italic 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('(Not Yet Added)', 775, sigY + 30);
    }

    // Labels
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 16px "Lexend", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText("Nitin Shrimali", 425, sigY + 80);
    ctx.font = '12px "Lexend", sans-serif'; ctx.fillStyle = '#64748b'; ctx.fillText("Founder, NSCH", 425, sigY + 95);

    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 16px "Lexend", sans-serif';
    ctx.fillText("Vinayak Pandya", 775, sigY + 80);
    ctx.font = '12px "Lexend", sans-serif'; ctx.fillStyle = '#64748b'; ctx.fillText("Founder, CAMPUSHUB", 775, sigY + 95);

    return canvas;
}

window.generateCertificate = async (title, score, date, name, email) => {
    let btn = event ? event.target.closest('button') : null;
    let originalText = "";
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span> Generating...`;
    }

    try {
        const canvas = await generateCertificateCanvas(title, score, date, name, email);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 1200, 850);

        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${safeName}_Certificate.pdf`);
    } catch (err) {
        console.error(err);
        alert("Failed to generate certificate: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

window.shareCertificate = async (title, score, date, name, email) => {
    let btn = event ? event.target.closest('button') : null;
    let originalText = "";
    if (btn) {
        originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span> Sharing...`;
    }

    try {
        const canvas = await generateCertificateCanvas(title, score, date, name, email);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 1200, 850);

        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `${safeName}_Certificate.pdf`, { type: 'application/pdf' });

        const shareData = {
            title: '🎉 Certificate of Achievement 🛡️',
            text: `🎉 *Certificate of Achievement* 🛡️\n\nI have successfully cleared the *Safe Netizen Assessment* with a qualifying score! 🚀\n\nThis recognition is awarded under the *Nitin Shrimali's Cyber Hygiene (NSCH)* initiative, validating my proficiency in:\n✅ Digital Defense\n✅ Scam Prevention\n✅ Secure Online Conduct\n\n#CyberSecurity #SafeNetizen #NSCH #CampusHub #Certfied`,
            files: [file]
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // Fallback: Just text share if file sharing isn't supported
            const fallbackData = {
                title: shareData.title,
                text: shareData.text,
                url: window.location.href
            };
            if (navigator.share) await navigator.share(fallbackData);
            else alert("Sharing is not supported on this device/browser.");
        }
    } catch (err) {
        console.error(err);
        alert("Failed to share certificate: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

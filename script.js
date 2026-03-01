// --- 1. IMPORT FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- 2. FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCZJnFsvkXuEOwjRXFb06rcZ-w39L7Lv9c",
  authDomain: "leave-planner-2026-d0f0f.firebaseapp.com",
  projectId: "leave-planner-2026-d0f0f",
  storageBucket: "leave-planner-2026-d0f0f.firebasestorage.app",
  messagingSenderId: "887744260902",
  appId: "1:887744260902:web:cbfe5b640870f0d7166fe7",
  measurementId: "G-TF7Q1PHYV2"
};

// --- 3. APP LOGIC ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const YEAR = 2026;
let userId = null;
let activeMode = 'leave'; // 'leave' or 'block'

// Expose setMode to window
window.setMode = function(mode) {
    activeMode = mode;
    document.getElementById('mode-leave').classList.toggle('active', mode === 'leave');
    document.getElementById('mode-block').classList.toggle('active', mode === 'block');
};

const state = {
    totalAnnualLeave: 21,
    leaveMap: new Map(),
    phMap: new Map(),
    suggestedLeaveMap: new Map(),
    isLoaded: false
};

// Data Setup
const HOLIDAYS = [
    { date: '2026-01-01', name: 'New Year\'s Day', isObserved: false },
    { date: '2026-02-17', name: 'Chinese New Year 1', isObserved: false },
    { date: '2026-02-18', name: 'Chinese New Year 2', isObserved: false },
    { date: '2026-03-21', name: 'Hari Raya Puasa', isObserved: false },
    { date: '2026-04-03', name: 'Good Friday', isObserved: false },
    { date: '2026-05-01', name: 'Labour Day', isObserved: false },
    { date: '2026-05-27', name: 'Hari Raya Haji', isObserved: false },
    { date: '2026-05-31', name: 'Vesak Day', isObserved: false },
    { date: '2026-06-01', name: 'Vesak Off-in-Lieu', isObserved: true },
    { date: '2026-08-09', name: 'National Day', isObserved: false },
    { date: '2026-08-10', name: 'National Day Off-in-Lieu', isObserved: true },
    { date: '2026-11-08', name: 'Deepavali', isObserved: false },
    { date: '2026-11-09', name: 'Deepavali Off-in-Lieu', isObserved: true },
    { date: '2026-12-25', name: 'Christmas Day', isObserved: false },
];
const SUGGESTIONS = [
    '2026-01-02', '2026-02-16', '2026-02-19', '2026-02-20', '2026-03-20',
    '2026-05-25', '2026-05-26', '2026-05-28', '2026-05-29', '2026-08-07',
    '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24'
];

HOLIDAYS.forEach(h => state.phMap.set(h.date, h));
SUGGESTIONS.forEach(d => state.suggestedLeaveMap.set(d, "Suggested Leave"));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Core Functions
const dateToKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
}

async function saveToCloud() {
    if (!userId) return;
    const data = {
        total: state.totalAnnualLeave,
        leaves: Object.fromEntries(state.leaveMap),
        updated: new Date().toISOString()
    };
    document.getElementById('save-status').textContent = "Saving...";
    try {
        await setDoc(doc(db, "planners", userId), data);
        document.getElementById('save-status').textContent = "Saved";
    } catch (e) {
        console.error(e);
        document.getElementById('save-status').textContent = "Save Error";
    }
}

// --- NEW CYCLE INTERACTION LOGIC ---
function handleDateInteract(key, isWeekend, ph) {
    if(ph || isWeekend) return showToast("Cannot modify weekends or holidays");

    // Current value
    const currentVal = state.leaveMap.get(key) || 0;
    let newVal = 0; // default to clear

    if (activeMode === 'leave') {
        // Cycle: Empty (0) -> Full (1.0) -> Half (0.5) -> Empty (0)
        if (currentVal === 0 || currentVal === 0.0) newVal = 1.0;
        else if (currentVal === 1.0) newVal = 0.5;
        else if (currentVal === 0.5) newVal = 0;
        // Note: If currently Blocked (0), treat as Empty and go to Full.
    }
    else if (activeMode === 'block') {
        // Toggle: Empty/Leave -> Blocked (0) -> Empty
        // We use 0.001 or string 'block' typically, but here 0 is used for block?
        // Wait, previous code used 0 for block. But standard empty is undefined.
        // Let's ensure 0 means Blocked visually.
        // Actually, let's use -1 for Block to distinguish from Empty (undefined/null).
        // Refactoring Model: 1=Full, 0.5=Half, -1=Block, undefined=Empty.

        if (currentVal === -1) newVal = 0; // Clear block
        else newVal = -1; // Set block
    }

    // Check Balance (Only if adding leave)
    let used = 0;
    state.leaveMap.forEach(v => { if(v > 0) used += v; });
    const remaining = state.totalAnnualLeave - used;

    // Calculate cost difference of this specific change
    let costDiff = 0;
    if (newVal > 0) costDiff += newVal;
    if (currentVal > 0) costDiff -= currentVal;

    if (remaining - costDiff < 0) {
         return showToast("Balance depleted");
    }

    // Apply
    if (newVal === 0) state.leaveMap.delete(key);
    else state.leaveMap.set(key, newVal);

    render(); saveToCloud();
}

function render() {
    // Balance
    let used = 0;
    state.leaveMap.forEach(v => { if(v > 0) used += v; });
    const remaining = state.totalAnnualLeave - used;
    document.getElementById('leave-balance').textContent = remaining.toFixed(1);
    document.getElementById('total-days-display').textContent = `Remaining of ${state.totalAnnualLeave.toFixed(1)} days`;

    // Grid
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    for (let m = 0; m < 12; m++) {
        const section = document.createElement('section');
        section.className = 'bg-white rounded-xl shadow-md p-4';
        section.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-center text-gray-700">${MONTHS[m]}</h2>`;

        const daysContainer = document.createElement('div');
        daysContainer.className = 'grid grid-cols-7 gap-1 text-center';

        // Header
        ['S','M','T','W','T','F','S'].forEach((d,i) => {
            const h = document.createElement('div');
            h.className = `text-xs font-bold ${i===0||i===6 ? 'text-red-500':''}`;
            h.textContent = d;
            daysContainer.appendChild(h);
        });

        // Spacers
        const firstDay = new Date(Date.UTC(YEAR, m, 1)).getUTCDay();
        for(let i=0; i<firstDay; i++) daysContainer.appendChild(document.createElement('div'));

        // Days
        const daysInMonth = new Date(Date.UTC(YEAR, m+1, 0)).getUTCDate();
        for(let d=1; d<=daysInMonth; d++) {
            const date = new Date(Date.UTC(YEAR, m, d));
            const key = dateToKey(date);
            const dayOfWeek = date.getUTCDay();
            const isWeekend = dayOfWeek===0 || dayOfWeek===6;
            const ph = state.phMap.get(key);
            const val = state.leaveMap.get(key);

            const el = document.createElement('div');
            let classes = "day-cell h-14 rounded-lg flex flex-col items-center justify-center border text-sm relative cursor-pointer active:scale-95 transition-transform ";

            if (val === 1) classes += "bg-emerald-500 text-white border-emerald-600 shadow-md font-bold";
            else if (val === 0.5) classes += "half-day border-emerald-500 shadow-md font-bold";
            else if (val === -1 || val === 0) classes += "bg-red-500 text-white border-red-600 shadow-md font-bold"; // 0 was block in old logic, -1 in new
            else if (ph) classes += "bg-blue-500 text-white border-blue-600 cursor-default";
            else if (isWeekend) classes += "bg-gray-100 text-gray-400 border-gray-100 cursor-default";
            else if (state.suggestedLeaveMap.has(key)) classes += "bg-yellow-400 text-gray-900 border-yellow-500";
            else classes += "bg-white hover:bg-blue-50 border-gray-100";

            el.className = classes;
            el.innerHTML = `<span class="z-10">${d}</span>`;

            // Labels
            if(ph) el.innerHTML += `<div class="text-[8px] leading-none mt-1 opacity-90">${ph.isObserved?'OFF':'PH'}</div>`;
            else if(val === 1) el.innerHTML += `<div class="text-[8px] leading-none mt-1">FULL</div>`;
            else if(val === 0.5) el.innerHTML += `<div class="text-[8px] leading-none mt-1">HALF</div>`;
            else if(val === -1 || val === 0) el.innerHTML += `<div class="text-[8px] leading-none mt-1">BLOCK</div>`;

            // Interaction
            if(!ph && !isWeekend) {
                el.onclick = () => handleDateInteract(key, isWeekend, ph);
            }
            daysContainer.appendChild(el);
        }
        section.appendChild(daysContainer);
        grid.appendChild(section);
    }
}

// --- 4. INITIALIZATION ---

function listenToUser(uid) {
     userId = uid;
     document.getElementById('user-id-display').textContent = userId.substring(0,8);

     // Update URL safely
     const newUrl = new URL(window.location);
     newUrl.searchParams.set('uid', userId);
     try { window.history.pushState({}, '', newUrl); } catch(e){}

     onSnapshot(doc(db, "planners", userId), (doc) => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-screen')?.remove(), 500);

        if (doc.exists()) {
            const data = doc.data();
            state.totalAnnualLeave = data.total || 21;
            // Handle transition of old block logic (0) to new (-1) if needed, or just handle both in render
            state.leaveMap = new Map(Object.entries(data.leaves || {}));
            document.getElementById('save-status').textContent = "Synced";
        } else {
            saveToCloud();
        }
        state.isLoaded = true;
        render();
    });
}

async function init() {
    try {
        await signInAnonymously(auth);
        const params = new URLSearchParams(window.location.search);
        const urlUid = params.get('uid');
        if (urlUid) listenToUser(urlUid);
        else listenToUser(auth.currentUser.uid);

        // Setup UI Listeners
        document.getElementById('edit-balance-btn').addEventListener('click', () => {
            document.getElementById('balance-display').classList.add('hidden');
            document.getElementById('balance-edit-form').classList.remove('hidden');
            document.getElementById('new-total-leave').value = state.totalAnnualLeave;
        });
        document.getElementById('save-balance-btn').addEventListener('click', () => {
            const val = parseFloat(document.getElementById('new-total-leave').value);
            if(val >= 0) {
                state.totalAnnualLeave = val;
                document.getElementById('balance-display').classList.remove('hidden');
                document.getElementById('balance-edit-form').classList.add('hidden');
                render(); saveToCloud();
            }
        });

        // Modal
        const modal = document.getElementById('sync-modal');
        document.getElementById('open-sync-btn').onclick = () => modal.classList.remove('hidden');
        document.getElementById('cancel-sync-btn').onclick = () => modal.classList.add('hidden');
        document.getElementById('confirm-sync-btn').onclick = () => {
            const inputId = document.getElementById('manual-id-input').value.trim();
            if(inputId) { listenToUser(inputId); modal.classList.add('hidden'); showToast("Switched ID"); }
        };
        document.getElementById('copy-link-btn').onclick = () => {
            navigator.clipboard.writeText(window.location.href).then(() => showToast("Link Copied!"));
        };

    } catch (e) {
        console.error("Init Error", e);
        document.getElementById('loading-screen').innerHTML = `<p class="text-red-500">Error: Check Console.</p>`;
    }
}

init();

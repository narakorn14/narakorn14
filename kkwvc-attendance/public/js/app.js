// --- AppSessionManager Object (จัดการ Session Timeout) ---
const AppSessionManager = {
    timeoutInMilliseconds: 30 * 60 * 1000, // Default: 30 นาที
    warningBeforeMilliseconds: 1 * 60 * 1000, // Default: เตือนก่อน 2 นาที
    sessionTimeoutId: null,
    warningTimeoutId: null,
    isWarningDialogVisible: false,
    isInitialized: false, // Flag to prevent multiple initializations of listeners

    startSessionTimer: function() {
        if (!Auth.currentUser) return;
        // console.log("Session timer (re)started for user:", Auth.currentUser.uid); // Uncomment for debugging
        this.clearSessionTimers();

        this.sessionTimeoutId = setTimeout(() => {
            console.log("Session timed out for user:", Auth.currentUser ? Auth.currentUser.uid : 'N/A');
            if (Auth.currentUser) { // Check again if user exists before logging out
                Auth.handleLogout();
                // Consider showing a more user-friendly message after redirecting to login
                // alert("เซสชันหมดอายุเนื่องจากไม่มีการใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
            }
        }, this.timeoutInMilliseconds);

        if (this.warningBeforeMilliseconds > 0 && this.timeoutInMilliseconds > this.warningBeforeMilliseconds) {
            this.warningTimeoutId = setTimeout(() => {
                if (Auth.currentUser) this.showWarningDialog();
            }, this.timeoutInMilliseconds - this.warningBeforeMilliseconds);
        }
    },

    resetSessionTimer: function() {
        if (Auth.currentUser) {
            this.startSessionTimer();
            if (this.isWarningDialogVisible) this.hideWarningDialog();
        }
    },

    clearSessionTimers: function() {
        // console.log("Clearing session timers."); // Uncomment for debugging
        if (this.sessionTimeoutId) clearTimeout(this.sessionTimeoutId);
        if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);
        this.sessionTimeoutId = null;
        this.warningTimeoutId = null;
        this.hideWarningDialog(); // Ensure warning is hidden if timers are cleared
    },

    showWarningDialog: function() {
        if (this.isWarningDialogVisible || !Auth.currentUser) return;
        let modal = document.getElementById('sessionWarningModal');
        if (modal) modal.remove(); // Clean up if somehow exists

        this.isWarningDialogVisible = true;
        const timeLeftMinutes = Math.ceil(this.warningBeforeMilliseconds / (1000 * 60));
        const warningMessage = `เซสชันของคุณจะหมดอายุในอีกประมาณ ${timeLeftMinutes} นาที ต้องการใช้งานต่อหรือไม่?`;

        const modalHTML = `
                <div id="sessionWarningModal" class="session-warning-modal"> <!-- class นี้มี display:flex -->
                <div class="modal-content">
                    <h4><i class="fas fa-exclamation-triangle"></i> แจ้งเตือนเซสชัน</h4>
                    <p>${warningMessage}</p>
                    <button id="extendSessionBtn" class="btn btn-primary">ใช้งานต่อ</button> <!-- ใช้ class .btn .btn-primary -->
                    <button id="logoutSessionBtn" class="btn btn-secondary">ออกจากระบบ</button> <!-- ใช้ class .btn .btn-secondary -->
                </div>
                </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        modal = document.getElementById('sessionWarningModal'); // Re-select after adding
        const extendBtn = document.getElementById('extendSessionBtn');
        const logoutBtn = document.getElementById('logoutSessionBtn');

        if(modal) void modal.offsetWidth; // Force reflow for transition
        if(modal) modal.classList.add('show'); // Add class to trigger CSS show animation

        if (extendBtn) extendBtn.addEventListener('click', () => {
            this.resetSessionTimer();
            this.hideWarningDialog();
        });
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            this.hideWarningDialog();
            Auth.handleLogout();
        });
    },

    hideWarningDialog: function() {
        const modal = document.getElementById('sessionWarningModal');
        if (modal) {
            modal.classList.remove('show');
            // Remove modal from DOM after transition
            setTimeout(() => {
                if (modal && !modal.classList.contains('show')) modal.remove();
            }, 300); // Should match your CSS transition duration for opacity/visibility
        }
        this.isWarningDialogVisible = false;
    },

    setupActivityListeners: function() {
        if (this.isInitialized) return; // Initialize listeners only once
        console.log("Setting up activity listeners for session timeout.");
        ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'].forEach(eventType => {
            document.addEventListener(eventType, () => this.resetSessionTimer(), { capture: true, passive: true });
        });
        this.isInitialized = true;
    },

    init: function(timeoutMinutes = 30, warningMinutes = 1) { // Default 30 min timeout, 2 min warning
        if (timeoutMinutes <= 0) {
            console.log("Session timeout disabled or invalid value.");
            return;
        }
        this.timeoutInMilliseconds = timeoutMinutes * 60 * 1000;
        this.warningBeforeMilliseconds = (warningMinutes > 0 && warningMinutes < timeoutMinutes) ? warningMinutes * 60 * 1000 : 0;

        this.setupActivityListeners(); // Setup global activity listeners
        console.log(`Session manager initialized. Timeout: ${timeoutMinutes}m, Warning: ${this.warningBeforeMilliseconds > 0 ? warningMinutes + 'm before' : 'disabled'}.`);
    }
};
// --- จบ AppSessionManager ---


const App = {
    init: function() {
        console.log("App.init() called.");
        Auth.init(); // Initialize authentication (this will set up onAuthStateChanged)
        AppSessionManager.init(1, 0.5); // Initialize session manager (e.g., 30 min timeout, 2 min warning)
                                       // For testing: AppSessionManager.init(1, 0.5);

        // If on dashboard page, add logout button event listener
        // This should ideally be part of the dashboard's specific UI rendering logic (e.g., in Admin.init or Teacher.init)
        // But keeping it here if it's a global button in dashboard.html's static part.
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => Auth.handleLogout());
        }
    },

    loadDashboardContent: async function() {
        console.log("App.loadDashboardContent() called.");
        const mainContent = document.getElementById('mainContent');
        const userInfo = document.getElementById('userInfo');
        const dashboardNav = document.getElementById('dashboardNav'); // For clearing/setting nav

        if (!mainContent) {
            console.error("loadDashboardContent: mainContent element not found. Cannot proceed.");
            return;
        }

        // Case 1: No user logged in (should be handled by Auth.onAuthStateChanged redirect mostly)
        if (!Auth.currentUser) {
            mainContent.innerHTML = '<p>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>';
            if (userInfo) userInfo.textContent = '';
            if (dashboardNav) dashboardNav.innerHTML = ''; // Clear nav
            return;
        }

        // Case 2: User is logged in, but role is still being fetched (Auth.userRole is null)
        // Auth.fetchUserRole sets userRole to null if not found or error, or the actual role string.
        if (Auth.userRole === null && Auth.currentUser) {
            console.log("loadDashboardContent: User role is null (fetching or not found). Displaying loading/error.");
            mainContent.innerHTML = '<p>กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>';
            if (userInfo) userInfo.textContent = `ผู้ใช้: ${Auth.currentUser.displayName || Auth.currentUser.email} (กำลังตรวจสอบสิทธิ์...)`;
            if (dashboardNav) dashboardNav.innerHTML = '';
            // No setTimeout loop here. Auth.onAuthStateChanged should re-trigger if role fetch completes.
            // If role fetch fails and stays null, this message will persist until user logs out or refreshes.
            return;
        }

        // Case 3: User and Role are available
        let roleDisplayText = 'ไม่ระบุสิทธิ์';
        if (Auth.userRole === 'admin') {
            roleDisplayText = 'ผู้ดูแลระบบ';
        } else if (Auth.userRole === 'teacher') {
            roleDisplayText = 'ครู';
        } else if (Auth.userRole === 'pending_teacher') {
            roleDisplayText = 'รอการอนุมัติ';
        }

        if (userInfo) {
            const displayName = Auth.currentUser.displayName || Auth.currentUser.email;
            userInfo.textContent = `ผู้ใช้: ${displayName} (สิทธิ์: ${roleDisplayText})`;
        }

        if (dashboardNav) dashboardNav.innerHTML = ''; // Clear previous nav before Admin/Teacher renders their own

        if (Auth.userRole === 'pending_teacher') {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 20px;" class="container">
                    <h2>สถานะบัญชี: รอการอนุมัติ</h2>
                    <p>บัญชีของคุณ (${Auth.currentUser.email}) ได้รับการสมัครเรียบร้อยแล้ว</p>
                    <p>ขณะนี้กำลังรอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ</p>
                    <p>กรุณาลองเข้าสู่ระบบอีกครั้งในภายหลัง หรือติดต่อผู้ดูแลระบบของวิทยาลัย</p>
                    <p style="margin-top: 20px;"><button id="logoutButtonPending" class="btn btn-secondary">ออกจากระบบ</button></p>
                </div>`;
            // It's better if the main logoutButton is always present in dashboard.html header,
            // and this specific button is not needed. The main logoutButton will work.
            // If you must have it:
            const logoutButtonPending = document.getElementById('logoutButtonPending');
            if (logoutButtonPending) {
                logoutButtonPending.addEventListener('click', () => Auth.handleLogout());
            }
        } else if (Auth.isAdmin()) {
            // Admin.init should be responsible for rendering the admin-specific navigation
            // into 'dashboardNav' and content into 'mainContent'.
            console.log("Loading Admin specific UI.");
            Admin.init(mainContent);
        } else if (Auth.isTeacher()) {
            // Teacher.init should be responsible for rendering the teacher-specific navigation
            // into 'dashboardNav' and content into 'mainContent'.
            console.log("Loading Teacher specific UI.");
            Teacher.init(mainContent);
        } else {
            // Fallback for unknown or null (after failed fetch) role
            console.warn("loadDashboardContent: User has an unknown or unhandled role:", Auth.userRole);
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 20px;" class="container">
                    <h2>ไม่สามารถเข้าถึงระบบได้</h2>
                    <p>ไม่พบสิทธิ์ผู้ใช้งานที่ถูกต้องสำหรับบัญชี (${Auth.currentUser.email}) ของคุณ (สิทธิ์ปัจจุบัน: ${Auth.userRole || 'ไม่มี'}).</p>
                    <p>กรุณาติดต่อผู้ดูแลระบบหากคุณคิดว่านี่เป็นข้อผิดพลาด</p>
                </div>`;
            // The main logoutButton in dashboard.html header should still work.
        }
    }
};

// การเรียก App.init() ควรมาจาก <script> ใน HTML (index.html และ dashboard.html)
// ภายใน DOMContentLoaded event listener:
// document.addEventListener('DOMContentLoaded', () => {
//     App.init();
// });
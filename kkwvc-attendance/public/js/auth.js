const Auth = {
    currentUser: null,
    userRole: null,

    init: function() {
        console.log("Auth.init() called - Setting up auth state listener and forms if on login page.");

        // ผูก Event Listener ถ้าอยู่ในหน้า Login/Register (index.html)
        // (ย้ายการผูก loginForm มาที่นี่ด้วยเพื่อให้สอดคล้อง)
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
            this.initLoginAndRegisterForms(); // ฟังก์ชันนี้จะผูกทั้ง login และ register form
        }

        // Listener for auth state changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                AppSessionManager.startSessionTimer(); // <<<<<< START/RESET SESSION TIMER
                this.currentUser = user;
                console.log("User logged in:", user.uid, user.email, "| DisplayName:", user.displayName);
                await this.fetchUserRole(user.uid);

                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                    // User is on login/register page
                    if (this.userRole || (this.userRole === null && Auth.currentUser)) {
                        // If role is fetched (any role including pending) or still fetching (but user exists), go to dashboard.
                        // Dashboard will handle display based on role (e.g., "pending approval" message).
                        console.log(`User on login page with role '${this.userRole}', redirecting to dashboard.`);
                        window.location.href = 'dashboard.html';
                    }
                    // If userRole is undefined (very initial state, very unlikely here now), they stay.
                } else if (window.location.pathname.includes('dashboard.html')) {
                    // User is already on (or navigating to) dashboard page
                    // App.loadDashboardContent will be called to update UI based on fetched role.
                    // It will also handle cases where role fetch failed (userRole remains null).
                    App.loadDashboardContent();
                }
            } else { // No user logged in
                AppSessionManager.clearSessionTimers(); // <<<<<<< CLEAR SESSION TIMER
                this.currentUser = null;
                this.userRole = null;
                console.log("User logged out or not logged in.");

                // Redirect to login page if on dashboard or other protected pages
                if (window.location.pathname.includes('dashboard.html') ||
                    (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/'))) {
                    window.location.href = 'index.html';
                }

                // Clear forms if on login page
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
                    this.clearAuthForms();
                }

                // Clear dashboard specific elements (though redirect should handle this)
                const mainContent = document.getElementById('mainContent');
                if (mainContent && window.location.pathname.includes('dashboard.html')) mainContent.innerHTML = '<p>กรุณาเข้าสู่ระบบ</p>';
                const userInfo = document.getElementById('userInfo');
                if (userInfo) userInfo.textContent = '';
                const dashboardNav = document.getElementById('dashboardNav');
                if (dashboardNav) dashboardNav.innerHTML = '';
            }
        });
    },

    clearAuthForms: function() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();

        const loginError = document.getElementById('loginError');
        const registerMessage = document.getElementById('registerMessage');
        if (loginError) { loginError.textContent = ''; loginError.classList.remove('show'); }
        if (registerMessage) { registerMessage.textContent = ''; registerMessage.className = 'message'; }
    },

    initLoginAndRegisterForms: function() {
        console.log("Auth.initLoginAndRegisterForms() called to bind forms.");
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const showRegisterFormLink = document.getElementById('showRegisterFormLink');
        const showLoginFormLink = document.getElementById('showLoginFormLink');

        if (loginForm) {
            if (!loginForm._eventAttachedLogin) {
                loginForm.addEventListener('submit', this.handleLogin.bind(this));
                loginForm._eventAttachedLogin = true;
                 console.log("Login form event listener attached.");
            }
        } else { console.warn("Login form (loginForm) not found for binding."); }

        if (registerForm) {
            if (!registerForm._eventAttachedRegister) {
                registerForm.addEventListener('submit', this.handleRegister.bind(this));
                registerForm._eventAttachedRegister = true;
                console.log("Register form event listener attached.");
            }
        } else { console.warn("Register form (registerForm) not found for binding."); }

        if (showRegisterFormLink && showLoginFormLink && loginForm && registerForm) {
            if (!showRegisterFormLink._eventAttachedToggle) {
                showRegisterFormLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    loginForm.style.display = 'none';
                    registerForm.style.display = 'block';
                    this.clearAuthForms();
                });
                showRegisterFormLink._eventAttachedToggle = true;
            }
            if (!showLoginFormLink._eventAttachedToggle) {
                showLoginFormLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    registerForm.style.display = 'none';
                    loginForm.style.display = 'block';
                    this.clearAuthForms();
                });
                showLoginFormLink._eventAttachedToggle = true;
            }
        } else { console.warn("Toggle form links or necessary forms not found for binding toggle links."); }
    },

    handleLogin: async function(event) {
        event.preventDefault();
        // ใช้ ID จาก HTML ของคุณ (email, password)
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginError = document.getElementById('loginError');

        if (!emailInput || !passwordInput || !loginError) {
            console.error("Login form elements ('email', 'password', 'loginError') are missing in handleLogin.");
            if(loginError) loginError.textContent = "เกิดข้อผิดพลาดภายในฟอร์ม";
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;

        loginError.classList.remove('show');
        loginError.textContent = '';

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged handles redirect
        } catch (error) {
            console.error("Login failed:", error.code, error.message);
            loginError.textContent = this.getFriendlyAuthErrorMessage(error);
            loginError.classList.add('show');
        }
    },

    handleRegister: async function(event) {
        event.preventDefault();
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        const confirmPasswordInput = document.getElementById('registerConfirmPassword');
        const registerMessage = document.getElementById('registerMessage');

        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput || !registerMessage) {
            console.error("One or more registration form elements are missing for registration.");
            if(registerMessage) { registerMessage.textContent = 'ข้อผิดพลาด: องค์ประกอบฟอร์มไม่ครบถ้วน'; registerMessage.className = 'message error';}
            return;
        }
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        registerMessage.textContent = '';
        registerMessage.className = 'message';

        if (!name) { registerMessage.textContent = 'กรุณากรอกชื่อ-นามสกุล'; registerMessage.classList.add('error'); return; }
        if (!email) { registerMessage.textContent = 'กรุณากรอกอีเมล'; registerMessage.classList.add('error'); return; }
        if (password !== confirmPassword) { registerMessage.textContent = 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน'; registerMessage.classList.add('error'); return; }
        if (password.length < 6) { registerMessage.textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'; registerMessage.classList.add('error'); return; }

        try {
            registerMessage.textContent = 'กำลังสมัครสมาชิก...';
            registerMessage.className = 'message info';

            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            await user.updateProfile({ displayName: name });
            console.log("User profile updated with displayName:", name);

            const initialRole = 'pending_teacher';
            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: name,
                role: initialRole,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("User document created in Firestore with role:", initialRole, "for UID:", user.uid);

            registerMessage.textContent = 'สมัครสมาชิกสำเร็จ! ระบบจะพยายามเข้าสู่ระบบให้ท่านเพื่อรอการอนุมัติจากผู้ดูแลระบบ';
            registerMessage.className = 'message success';
            // onAuthStateChanged will now detect this new user, fetchUserRole will set role to pending_teacher,
            // and then it will redirect to the dashboard, where App.loadDashboardContent will show the "pending approval" message.

            setTimeout(() => {
                if(document.getElementById('registerForm')) document.getElementById('registerForm').reset();
                // Optionally, switch back to login form after a delay
                // const loginF = document.getElementById('loginForm');
                // const registerF = document.getElementById('registerForm');
                // if (loginF && registerF && registerMessage) {
                //     registerF.style.display = 'none';
                //     loginF.style.display = 'block';
                //     registerMessage.textContent = '';
                //     registerMessage.className = 'message';
                // }
            }, 4000); // Increased delay to allow user to read the success message

        } catch (error) {
            console.error("Registration failed:", error.code, error.message);
            registerMessage.textContent = this.getFriendlyAuthErrorMessage(error);
            registerMessage.className = 'message error';
        }
    },

    handleLogout: async function() {
        AppSessionManager.clearSessionTimers(); // <<<<<<< CLEAR SESSION TIMER
        try {
            console.log("Attempting to sign out user:", Auth.currentUser ? Auth.currentUser.uid : "No user");
            await auth.signOut();
            console.log("User signed out successfully.");
            // onAuthStateChanged will handle redirect to index.html
        } catch (error) {
            console.error("Logout failed:", error);
        }
    },

    fetchUserRole: async function(uid) {
        if (!uid) {
            console.error("fetchUserRole called with no UID.");
            this.userRole = null;
            return;
        }
        try {
            const userDocRef = db.collection('users').doc(uid);
            const doc = await userDocRef.get();
            if (doc.exists) {
                this.userRole = doc.data().role;
                console.log("Fetched user role:", this.userRole, "for UID:", uid);
            } else {
                console.warn("User document not found in Firestore for UID:", uid, "(This is expected if user just registered and Firestore write is in progress, or if document was deleted, or never created due to rules/error). Role set to null.");
                this.userRole = null; // Explicitly set to null if no doc
            }
        } catch (error) {
            console.error("Error fetching user role for UID:", uid, error);
            this.userRole = null; // Set to null on error
        }
    },

    getFriendlyAuthErrorMessage: function(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
            case 'auth/user-disabled': return 'บัญชีผู้ใช้นี้ถูกระงับ';
            case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้นี้ (สำหรับเข้าสู่ระบบ)';
            case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
            case 'auth/email-already-in-use': return 'อีเมลนี้ถูกใช้งานแล้วสำหรับการสมัครสมาชิก';
            case 'auth/weak-password': return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
            case 'auth/operation-not-allowed': return 'การสมัครสมาชิกด้วยอีเมล/รหัสผ่านยังไม่ได้เปิดใช้งานใน Firebase project';
            case 'auth/requires-recent-login': return 'การดำเนินการนี้มีความละเอียดอ่อนและต้องการการยืนยันตัวตนใหม่ กรุณา Login อีกครั้ง';
            default:
                console.error("Unhandled Firebase Auth Error:", error); // Log the original error for debugging
                return `เกิดข้อผิดพลาด (${error.code}) กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแล`;
        }
    },

    isAdmin: function() { return this.userRole === 'admin'; },
    isTeacher: function() { return this.userRole === 'teacher'; },
    isPendingTeacher: function() { return this.userRole === 'pending_teacher'; } // Added helper
};
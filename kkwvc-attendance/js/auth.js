const Auth = {
    currentUser: null,
    userRole: null,

    init: function() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Listener for auth state changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                console.log("User logged in:", user.uid, user.email);
                await this.fetchUserRole(user.uid); // Fetch role from Firestore
                // Redirect to dashboard or show appropriate UI
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    window.location.href = 'dashboard.html';
                } else if (window.location.pathname.endsWith('dashboard.html')) {
                    App.loadDashboardContent(); // A function in app.js to load content
                }
            } else {
                this.currentUser = null;
                this.userRole = null;
                console.log("User logged out.");
                // Redirect to login page if not already there
                if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
                // Clear dashboard content if on dashboard page (should have been redirected)
                const mainContent = document.getElementById('mainContent');
                if (mainContent) mainContent.innerHTML = '<p>กรุณาเข้าสู่ระบบ</p>';
            }
        });
    },

    handleLogin: async function(event) {
        event.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('loginError');
        loginError.textContent = '';

        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Auth state listener will handle redirect
        } catch (error) {
            console.error("Login failed:", error);
            loginError.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง: " + error.message;
        }
    },

    handleLogout: async function() {
        try {
            await auth.signOut();
            // Auth state listener will handle redirect
        } catch (error) {
            console.error("Logout failed:", error);
        }
    },

    fetchUserRole: async function(uid) {
        try {
            const userDocRef = db.collection('users').doc(uid);
            const doc = await userDocRef.get();
            if (doc.exists) {
                this.userRole = doc.data().role;
                console.log("User role:", this.userRole);
            } else {
                console.warn("User document not found in Firestore for UID:", uid);
                this.userRole = null; // Or a default role like 'guest'
                // Potentially sign out user if role is critical and not found
                // await this.handleLogout();
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            this.userRole = null;
        }
    },

    // Helper to check role, can be used for UI conditional rendering
    isAdmin: function() {
        return this.userRole === 'admin';
    },

    isTeacher: function() {
        return this.userRole === 'teacher';
    }
};
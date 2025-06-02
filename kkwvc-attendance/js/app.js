const App = {
    init: function() {
        console.log("App initialized.");
        Auth.init(); // Initialize authentication

        // If on dashboard page, add logout button event listener
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => Auth.handleLogout());
        }
    },

    loadDashboardContent: async function() {
        // This function will be called by auth.js after user is logged in and role is fetched
        const mainContent = document.getElementById('mainContent');
        const userInfo = document.getElementById('userInfo');
        
        if (!Auth.currentUser || !Auth.userRole) {
            mainContent.innerHTML = '<p>กำลังโหลดข้อมูลผู้ใช้...</p>';
            // Retry or wait a bit, then try again or show error.
            // This might happen if fetchUserRole is still in progress.
            // A more robust solution would use promises or callbacks.
            setTimeout(() => this.loadDashboardContent(), 1000);
            return;
        }

        if (userInfo) {
            userInfo.textContent = `ผู้ใช้: ${Auth.currentUser.email} (สิทธิ์: ${Auth.userRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู'})`;
        }
        
        if (Auth.isAdmin()) {
            mainContent.innerHTML = '<h2>หน้าแดชบอร์ดผู้ดูแลระบบ</h2>';
            // Load admin specific UI elements/functions
            Admin.init(mainContent); // Initialize admin functionalities
        } else if (Auth.isTeacher()) {
            mainContent.innerHTML = '<h2>หน้าแดชบอร์ดครู</h2>';
            // Load teacher specific UI elements/functions
            Teacher.init(mainContent);            
             // Initialize teacher functionalities
        } else {
            mainContent.innerHTML = '<p>ไม่พบสิทธิ์ผู้ใช้งานที่ถูกต้อง</p>';
            // Potentially logout user
             Auth.handleLogout();
        }
        // ต้องรอให้เมนูถูกโหลดแล้วค่อยผูก Event 
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navMenu = document.getElementById('navMenu');
        const navButtons = document.querySelectorAll('.nav-menu .nav-button');

        if (hamburgerBtn && navMenu) {
            hamburgerBtn.addEventListener('click', () => {
                navMenu.classList.toggle('show');
            });

            navButtons.forEach(button => {
                button.addEventListener('click', () => {
                    navMenu.classList.remove('show');
                });
            });
}

    }
};

// Global event listener for when the DOM is fully loaded.
// This is an alternative to the script tag in index.html
// document.addEventListener('DOMContentLoaded', () => App.init());
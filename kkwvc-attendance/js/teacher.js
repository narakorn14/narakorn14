const Teacher = {
    mainContentElement: null,
    currentTeacherId: null,
    assignedClasses: [],

    init: async function(mainContentElement) {
        this.mainContentElement = mainContentElement;
        this.currentTeacherId = Auth.currentUser.uid; // Get current teacher's UID

        if (!this.currentTeacherId) {
            this.mainContentElement.innerHTML = "<p>ไม่สามารถระบุข้อมูลครูได้ กรุณาเข้าสู่ระบบใหม่</p>";
            return;
        }
        await this.fetchAssignedClasses();
        this.renderNav();
        this.showDashboard(); // Default view for teacher
    },

    fetchAssignedClasses: async function() {
        try {
            const teacherMetaDoc = await db.collection('teachers_metadata').doc(this.currentTeacherId).get();
            if (teacherMetaDoc.exists) {
                this.assignedClasses = teacherMetaDoc.data().assignedClasses || [];
            } else {
                console.warn("Teacher metadata not found for:", this.currentTeacherId);
                this.assignedClasses = [];
            }
            // Now fetch full class details for the assigned classIds
            if (this.assignedClasses.length > 0) {
                const classPromises = this.assignedClasses.map(classId => db.collection('classes').doc(classId).get());
                const classDocs = await Promise.all(classPromises);
                this.assignedClassesDetails = classDocs.filter(doc => doc.exists).map(doc => ({id: doc.id, ...doc.data()}));
            } else {
                this.assignedClassesDetails = [];
            }

        } catch (error) {
            console.error("Error fetching assigned classes:", error);
            this.assignedClasses = [];
            this.assignedClassesDetails = [];
        }
    },

    renderNav: function() {
        const navElement = document.getElementById('dashboardNav');
        if (!navElement) return;
    
        let classNavItems = this.assignedClassesDetails.length > 0
            ? this.assignedClassesDetails.map(cls =>
                `<li><button class="nav-button" data-section="take-attendance" data-classid="${cls.id}">${cls.className} (เช็คชื่อ)</button></li>`).join('')
            : '<li><span class="nav-text">ยังไม่มีห้องเรียนที่ได้รับมอบหมาย</span></li>';
    
        navElement.innerHTML = `
        <button class="hamburger" id="hamburgerBtn" aria-label="เมนู">
        <i class="fa fa-bars"></i>
      </button>
            <ul class="nav-menu" id="navMenu">
                <li><button class="nav-button active" data-section="dashboard">แดชบอร์ดครู</button></li>
                ${classNavItems}
                <li><button class="nav-button" data-section="manage-my-students">จัดการนักเรียนในห้อง</button></li>
                <li><button class="nav-button" data-section="reports">ดูรายงาน (ของฉัน)</button></li>
            </ul>
        `;
    
        const hamburgerBtn = navElement.querySelector('#hamburgerBtn');
        const navMenu = navElement.querySelector('#navMenu');
    
        if (hamburgerBtn && navMenu) {
            hamburgerBtn.addEventListener('click', () => {
                navMenu.classList.toggle('show');
            });
        }
    
        navElement.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                const classId = e.target.dataset.classid;
                this.navigateTo(section, classId);
                navElement.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                navMenu.classList.remove('show'); // ✅ ยุบเมนู
            });
        });
    }
    ,

    navigateTo: function(section, classId = null) {
        switch(section) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'take-attendance':
                if (classId) {
                    Attendance.showAttendanceForm(this.mainContentElement, classId, this.currentTeacherId);
                } else {
                     this.mainContentElement.innerHTML = "<p>กรุณาเลือกห้องเรียนจากเมนูเพื่อเช็คชื่อ</p>";
                }
                break;
            case 'manage-my-students':
                // Teacher can manage students only for their classes
                StudentManager.init(this.mainContentElement, 'teacher', this.currentTeacherId, this.assignedClassesDetails);
                break;
            case 'reports':
                Report.showReportUI(this.mainContentElement, 'teacher', this.currentTeacherId, this.assignedClassesDetails);
                break;
            default:
                this.showDashboard();
        }
    },

    showDashboard: function() {
        let classListHtml = '<h4>ห้องเรียนที่รับผิดชอบ:</h4>';
        if (this.assignedClassesDetails.length > 0) {
            classListHtml += '<ul>';
            this.assignedClassesDetails.forEach(cls => {
                classListHtml += `<li>${cls.className} (ID: ${cls.id})</li>`;
            });
            classListHtml += '</ul>';
        } else {
            classListHtml += '<p>คุณยังไม่ได้รับมอบหมายห้องเรียนใดๆ</p>';
        }

        this.mainContentElement.innerHTML = `
            <h2>ภาพรวมสำหรับครู</h2>
            <p>ยินดีต้อนรับ, ครู ${Auth.currentUser.displayName || Auth.currentUser.email}!</p>
            ${classListHtml}
            <p>คุณสามารถเช็คชื่อนักเรียน จัดการข้อมูลนักเรียนในห้องที่รับผิดชอบ และดูรายงานได้จากเมนูด้านบน</p>
        `;
    }
};
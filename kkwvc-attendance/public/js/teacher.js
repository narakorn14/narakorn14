const Teacher = {
    mainContentElement: null,
    currentTeacherId: null,
    assignedClasses: [],
    assignedClassesDetails: [], // **เพิ่มบรรทัดนี้เพื่อให้แน่ใจว่า property ถูกประกาศไว้**

    init: async function(mainContentElement) {
        this.mainContentElement = mainContentElement;
        this.currentTeacherId = Auth.currentUser.uid; // Get current teacher's UID

        if (!this.currentTeacherId) {
            this.mainContentElement.innerHTML = "<p>ไม่สามารถระบุข้อมูลครูได้ กรุณาเข้าสู่ระบบใหม่</p>";
            return;
        }
        await this.fetchAssignedClasses();
        this.renderNav(); // สร้างเมนูก่อน
        this.showDashboard(); // จากนั้นแสดงหน้าเริ่มต้น
    },

    fetchAssignedClasses: async function() {
        try {
            // Firestore v9 and later might use a different syntax for document ID access
            // Assuming v8 for compatibility with provided code
            const teacherMetaDoc = await db.collection('teachers_metadata').doc(this.currentTeacherId).get();
            if (teacherMetaDoc.exists) {
                this.assignedClasses = teacherMetaDoc.data().assignedClasses || [];
            } else {
                console.warn("Teacher metadata not found for:", this.currentTeacherId);
                this.assignedClasses = [];
            }
            // Now fetch full class details for the assigned classIds
            if (this.assignedClasses.length > 0) {
                 const classPromises = this.assignedClasses.map(classId => 
                    db.collection('classes').doc(classId).get()
                );
                const classDocs = await Promise.all(classPromises);
                this.assignedClassesDetails = classDocs
                    .filter(doc => doc.exists)
                    .map(doc => ({ id: doc.id, ...doc.data() })); // แก้ไขให้เก็บข้อมูลทั้งหมด
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
            ? this.assignedClassesDetails
                .sort((a, b) => a.className.localeCompare(b.className)) // Sort classes by name
                .map(cls =>
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
                <li><button class="nav-button" data-section="reports">รายงานสรุป (ของฉัน)</button></li>
                <li><button class="nav-button" data-section="individual-report">รายงานรายบุคคล (แก้ไข)</button></li> 
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
                // Prevent default action if it's inside a form or is an <a> tag
                e.preventDefault();

                const section = e.currentTarget.dataset.section;
                const classId = e.currentTarget.dataset.classid;
                this.navigateTo(section, classId);
                
                // Update active state
                navElement.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Hide menu on mobile after click
                if (navMenu.classList.contains('show')) {
                    navMenu.classList.remove('show');
                }
            });
        });
    },

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
                StudentManager.init(this.mainContentElement, 'teacher', this.currentTeacherId, this.assignedClassesDetails);
                break;
            case 'reports':
                Report.showReportUI(this.mainContentElement, 'teacher', this.currentTeacherId, this.assignedClassesDetails);
                break;
            case 'individual-report': // <--- เพิ่ม case นี้
                Report.showIndividualReportSearch(this.mainContentElement, 'teacher', this.currentTeacherId);
                break;
            default:
                this.showDashboard();
        }
    },

    showDashboard: function() {
        let classListHtml = '<h4>ห้องเรียนที่รับผิดชอบ:</h4>';
        if (this.assignedClassesDetails && this.assignedClassesDetails.length > 0) {
            const sortedClasses = [...this.assignedClassesDetails].sort((a, b) => a.className.localeCompare(b.className));
            classListHtml += '<ul>';
            sortedClasses.forEach(cls => {
                classListHtml += `<li>${cls.className} (ID: ${cls.id})</li>`;
            });
            classListHtml += '</ul>';
        } else {
            classListHtml += '<p>คุณยังไม่ได้รับมอบหมายห้องเรียนใดๆ</p>';
        }

        this.mainContentElement.innerHTML = `
            <h2>ภาพรวมสำหรับครู</h2>
            <p>ยินดีต้อนรับ, ${Auth.currentUser.displayName || Auth.currentUser.email}!</p>
            ${classListHtml}
            <p>คุณสามารถเช็คชื่อนักเรียน จัดการข้อมูลนักเรียนในห้องที่รับผิดชอบ และดูรายงานได้จากเมนูด้านบน</p>
        `;
    }
};
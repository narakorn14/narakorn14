const Admin = {
    mainContentElement: null,

    init: function(mainContentElement) {
        this.mainContentElement = mainContentElement;
        this.renderNav();
        this.showDashboard(); // Default view for admin
    },

    renderNav: function() {
        const navElement = document.getElementById('dashboardNav');
        if (!navElement) return;
        navElement.innerHTML = `
        <button class="hamburger" id="hamburgerBtn" aria-label="เมนู">
    <i class="fa fa-bars"></i>
  </button>
            <ul class="nav-menu" id="navMenu">
                <li><button class="nav-button active" data-section="dashboard">แดชบอร์ดผู้ดูแล</button></li>
                <li><button class="nav-button" data-section="manage-teachers">จัดการครู</button></li>
                <li><button class="nav-button" data-section="manage-classes">จัดการห้องเรียน</button></li>
                <li><button class="nav-button" data-section="manage-students">จัดการนักเรียน</button></li>
                <li><button class="nav-button" data-section="reports">ดูรายงาน</button></li>
            </ul>
        `;
        
        navElement.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.navigateTo(e.target.dataset.section);
                navElement.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        // Set initial active button
        navElement.querySelector('.nav-button[data-section="dashboard"]').classList.add('active');
    },

    navigateTo: function(section) {
        switch(section) {
            case 'dashboard':
                this.showDashboard();
                break;
            case 'manage-teachers':
                this.showManageTeachers();
                break;
            case 'manage-classes':
                this.showManageClasses();
                break;
            case 'manage-students':
                this.showManageStudents();
                break;
            case 'reports':
                Report.showReportUI(this.mainContentElement, 'admin'); // Call Report module
                break;
            default:
                this.showDashboard();
        }
    },

    showDashboard: function() {
        this.mainContentElement.innerHTML = `
            <h2>ภาพรวมระบบ (ผู้ดูแล)</h2>
            <p>ยินดีต้อนรับ, ผู้ดูแลระบบ!</p>
            <p>คุณสามารถจัดการข้อมูลครู, ห้องเรียน, นักเรียน และดูรายงานทั้งหมดได้จากเมนูด้านบน</p>
        `;
    },

    // --- จัดการครู ---
    showManageTeachers: async function() {
        this.mainContentElement.innerHTML = `
            <h3>จัดการบัญชีครู</h3>
            <div id="addTeacherFormContainer" class="form-container">
                <h4>เพิ่มครูใหม่</h4>
                <form id="addTeacherForm">
                    <div class="form-group">
                        <label for="teacherName">ชื่อ-นามสกุล ครู:</label>
                        <input type="text" id="teacherName" required>
                    </div>
                    <div class="form-group">
                        <label for="teacherEmail">อีเมล (สำหรับ Login):</label>
                        <input type="email" id="teacherEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="teacherPassword">รหัสผ่านเริ่มต้น:</label>
                        <input type="password" id="teacherPassword" required>
                    </div>
                    <button type="submit">เพิ่มครู</button>
                    <p id="addTeacherMessage"></p>
                </form>
            </div>
            <hr>
            <h4>รายชื่อครูในระบบ</h4>
            <div id="teachersList">กำลังโหลด...</div>
        `;

        document.getElementById('addTeacherForm').addEventListener('submit', this.handleAddTeacher.bind(this));
        await this.loadTeachersList();
    },

    handleAddTeacher: async function(event) {
        event.preventDefault();
        const name = document.getElementById('teacherName').value;
        const email = document.getElementById('teacherEmail').value;
        const password = document.getElementById('teacherPassword').value;
        const messageEl = document.getElementById('addTeacherMessage');
        messageEl.textContent = 'กำลังดำเนินการ...';

        try {
            // 1. Create user in Firebase Auth (This should ideally be done by a Cloud Function for security)
            // For simplicity in client-side example, we'll proceed, but note this risk.
            // A better approach is to have admin create user, then user sets their own password
            // Or, an admin creates user, and a cloud function creates the Auth user.
            // **WARNING: Creating users client-side with admin privileges for Auth is NOT recommended for production.
            // This part requires careful consideration of security. For now, assume admin uses Firebase Console or a secure backend script.**

            // For this example, we'll just add to Firestore. Admin would add Auth user via Firebase console.
            // The UID from Auth console would then be used.
            // Let's assume we have a function to call a Cloud Function (or simulate adding user to our DB).
            // For this demo, we will just add to 'users' and 'teachers_metadata'
            // This simplified example implies Admin manually created Auth User and has their UID.
            // A more complete flow:
            // 1. Admin fills form
            // 2. Call a Cloud Function:
            //    a. Cloud Function creates Auth user, gets UID.
            //    b. Cloud Function creates Firestore 'users' doc with UID, role 'teacher'.
            //    c. Cloud Function creates Firestore 'teachers_metadata' doc with UID.

            // Simplified for client-side example (ASSUMING AUTH USER IS MANUALLY CREATED OR VIA BACKEND):
            // This is a placeholder. You'd need the UID of the manually created Auth user.
            // Let's say we have a way to get that UID. For this example, we'll skip real Auth creation here.

            // Let's simulate the Firebase function part.
            // In a real app, you'd call a Firebase Function here which creates the Auth user and then these Firestore docs.
            // For this example, we'll just show adding to Firestore, assuming UID is obtained.
            // To make this somewhat runnable without a backend function, we'll just use a placeholder UID.
            // THIS IS NOT HOW YOU DO IT IN PRODUCTION.

            const placeholderUid = "UID_FROM_MANUALLY_CREATED_AUTH_USER_" + Date.now(); // Needs to be real UID

            await db.collection('users').doc(placeholderUid).set({
                email: email,
                displayName: name,
                role: 'teacher'
            });

            await db.collection('teachers_metadata').doc(placeholderUid).set({
                teacherId: placeholderUid, // Link to the users collection
                name: name, // Redundant but can be useful
                assignedClasses: []
            });

            messageEl.textContent = 'เพิ่มครูสำเร็จ (Firestore only - Auth user needs manual creation or backend script)';
            messageEl.style.color = 'green';
            document.getElementById('addTeacherForm').reset();
            await this.loadTeachersList();

        } catch (error) {
            console.error("Error adding teacher:", error);
            messageEl.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
            messageEl.style.color = 'red';
        }
    },

    loadTeachersList: async function() {
        const listEl = document.getElementById('teachersList');
        try {
            const querySnapshot = await db.collection('users').where('role', '==', 'teacher').get();
            if (querySnapshot.empty) {
                listEl.innerHTML = '<p>ยังไม่มีครูในระบบ</p>';
                return;
            }
            let html = '<ul>';
            querySnapshot.forEach(doc => {
                const teacher = doc.data();
                html += `<li>${teacher.displayName} (${teacher.email}) - UID: ${doc.id}
            <button class="btn btn-danger btn-sm" onclick="Admin.deleteUser('${doc.id}', '${teacher.displayName}')">ลบ</button>
                        </li>`;
            });
            html += '</ul>';
            listEl.innerHTML = html;
        } catch (error) {
            console.error("Error loading teachers:", error);
            listEl.innerHTML = '<p>ไม่สามารถโหลดรายชื่อครูได้</p>';
        }
    },

    deleteUser: async function(userId, userName) {
        // WARNING: Deleting Auth users client-side is generally not allowed for security reasons.
        // This should be handled by a Firebase Function.
        // For this demo, we'll only delete from Firestore 'users' and 'teachers_metadata'.
        if (confirm(`คุณต้องการลบบัญชีครู "${userName}" (UID: ${userId}) จริงหรือไม่? การดำเนินการนี้จะลบข้อมูลใน Firestore เท่านั้น บัญชี Authentication ต้องลบผ่าน Firebase Console หรือ Cloud Function`)) {
            try {
                await db.collection('users').doc(userId).delete();
                await db.collection('teachers_metadata').doc(userId).delete();
                // Potentially unassign classes, etc.
                alert('ลบข้อมูลครู (Firestore) สำเร็จแล้ว');
                await this.loadTeachersList();
            } catch (error) {
                console.error("Error deleting teacher from Firestore:", error);
                alert('เกิดข้อผิดพลาดในการลบข้อมูลครู: ' + error.message);
            }
        }
    },


    // --- จัดการห้องเรียน ---
    showManageClasses: async function() {
        this.mainContentElement.innerHTML = `
            <h3>จัดการห้องเรียน</h3>
            <div id="addClassFormContainer" class="form-container">
                <h4>เพิ่มห้องเรียนใหม่</h4>
                <form id="addClassForm">
                    <div class="form-group">
                        <label for="classId">รหัสห้องเรียน (เช่น CPE_Y1_S1):</label>
                        <input type="text" id="classId" required>
                    </div>
                    <div class="form-group">
                        <label for="className">ชื่อห้องเรียน (เช่น ปวช.1 คอมฯ กลุ่ม 1):</label>
                        <input type="text" id="className" required>
                    </div>
                    <div class="form-group">
                        <label for="classTeacher">ครูผู้สอน:</label>
                        <select id="classTeacher" required></select>
                    </div>
                    <button type="submit">เพิ่มห้องเรียน</button>
                    <p id="addClassMessage"></p>
                </form>
            </div>
            <hr>
            <h4>รายชื่อห้องเรียน</h4>
            <div id="classesList">กำลังโหลด...</div>
        `;
        await this.populateTeacherDropdown('classTeacher');
        document.getElementById('addClassForm').addEventListener('submit', this.handleAddClass.bind(this));
        await this.loadClassesList();
    },

    populateTeacherDropdown: async function(selectElementId) {
        const selectEl = document.getElementById(selectElementId);
        selectEl.innerHTML = '<option value="">กำลังโหลดครู...</option>';
        try {
            const querySnapshot = await db.collection('users').where('role', '==', 'teacher').get();
            if (querySnapshot.empty) {
                selectEl.innerHTML = '<option value="">ไม่มีครูในระบบ</option>';
                return;
            }
            let optionsHtml = '<option value="">-- เลือกครู --</option>';
            querySnapshot.forEach(doc => {
                const teacher = doc.data();
                optionsHtml += `<option value="${doc.id}">${teacher.displayName} (${teacher.email})</option>`;
            });
            selectEl.innerHTML = optionsHtml;
        } catch (error) {
            console.error("Error populating teachers dropdown:", error);
            selectEl.innerHTML = '<option value="">เกิดข้อผิดพลาด</option>';
        }
    },

    handleAddClass: async function(event) {
        event.preventDefault();
        const classId = document.getElementById('classId').value.trim().toUpperCase();
        const className = document.getElementById('className').value.trim();
        const teacherId = document.getElementById('classTeacher').value;
        const messageEl = document.getElementById('addClassMessage');
        messageEl.textContent = 'กำลังดำเนินการ...';

        if (!classId || !className || !teacherId) {
            messageEl.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
            messageEl.style.color = 'red';
            return;
        }

        try {
            // Check if classId already exists
            const classDoc = await db.collection('classes').doc(classId).get();
            if (classDoc.exists) {
                messageEl.textContent = 'รหัสห้องเรียนนี้มีอยู่แล้ว';
                messageEl.style.color = 'red';
                return;
            }

            await db.collection('classes').doc(classId).set({
                classId: classId,
                className: className,
                teacherId: teacherId
            });

            // Also update teacher's metadata
            const teacherMetaRef = db.collection('teachers_metadata').doc(teacherId);
            await db.runTransaction(async (transaction) => {
                const teacherMetaDoc = await transaction.get(teacherMetaRef);
                if (!teacherMetaDoc.exists) {
                    // This case might happen if teacher_metadata wasn't created properly.
                    // For robustness, you might create it here.
                    // For now, throw an error or log.
                    console.warn(`Teacher metadata for ${teacherId} not found. Creating one.`);
                     transaction.set(teacherMetaRef, { teacherId: teacherId, name: "Teacher Name (auto-created)", assignedClasses: [classId] });

                } else {
                    const assignedClasses = teacherMetaDoc.data().assignedClasses || [];
                    if (!assignedClasses.includes(classId)) {
                        assignedClasses.push(classId);
                        transaction.update(teacherMetaRef, { assignedClasses: assignedClasses });
                    }
                }
            });


            messageEl.textContent = 'เพิ่มห้องเรียนสำเร็จ!';
            messageEl.style.color = 'green';
            document.getElementById('addClassForm').reset();
            await this.loadClassesList();
        } catch (error) {
            console.error("Error adding class:", error);
            messageEl.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
            messageEl.style.color = 'red';
        }
    },

    loadClassesList: async function() {
        const listEl = document.getElementById('classesList');
        try {
            const querySnapshot = await db.collection('classes').orderBy('className').get();
            if (querySnapshot.empty) {
                listEl.innerHTML = '<p>ยังไม่มีห้องเรียนในระบบ</p>';
                return;
            }
            let html = '<ul>';
            for (const doc of querySnapshot.docs) {
                const cls = doc.data();
                let teacherName = 'N/A';
                if (cls.teacherId) {
                    const teacherDoc = await db.collection('users').doc(cls.teacherId).get();
                    if (teacherDoc.exists) {
                        teacherName = teacherDoc.data().displayName;
                    }
                }
                html += `<li>${cls.className} (ID: ${cls.classId}) - ครู: ${teacherName}
                            <button onclick="Admin.deleteClass('${cls.classId}', '${cls.className}')">ลบ</button>
                         </li>`;
            }
            html += '</ul>';
            listEl.innerHTML = html;
        } catch (error) {
            console.error("Error loading classes:", error);
            listEl.innerHTML = '<p>ไม่สามารถโหลดรายชื่อห้องเรียนได้</p>';
        }
    },

    deleteClass: async function(classId, className) {
        if (confirm(`คุณต้องการลบห้องเรียน "${className}" (ID: ${classId}) จริงหรือไม่? การดำเนินการนี้จะลบห้องเรียน และต้องอัปเดตข้อมูลครูและนักเรียนที่เกี่ยวข้องด้วยตนเอง/ผ่านสคริปต์เพิ่มเติม`)) {
            try {
                // 1. Delete the class document
                await db.collection('classes').doc(classId).delete();

                // 2. Remove classId from teacher's assignedClasses
                const teachersSnapshot = await db.collection('teachers_metadata').where('assignedClasses', 'array-contains', classId).get();
                const batch = db.batch();
                teachersSnapshot.forEach(doc => {
                    const teacherData = doc.data();
                    const updatedClasses = teacherData.assignedClasses.filter(id => id !== classId);
                    batch.update(doc.ref, { assignedClasses: updatedClasses });
                });
                await batch.commit();

                // 3. Consider what to do with students in this class.
                //    - Option 1: Delete them (if they only belong to this class) - DANGEROUS without warning
                //    - Option 2: Mark them as 'unassigned' or 'inactive'.
                //    - For now, we'll just alert the admin.
                alert(`ห้องเรียน "${className}" ถูกลบแล้ว กรุณาตรวจสอบและย้าย/ลบนักเรียนในห้องนี้ และตรวจสอบการมอบหมายงานของครู`);

                await this.loadClassesList();
            } catch (error) {
                console.error("Error deleting class:", error);
                alert('เกิดข้อผิดพลาดในการลบห้องเรียน: ' + error.message);
            }
        }
    },

    // --- จัดการนักเรียน (ใช้ StudentManager) ---
    showManageStudents: async function() {
        // Admin has full access to StudentManager
        StudentManager.init(this.mainContentElement, 'admin', null); // Admin doesn't have a specific teacherId
    }
};
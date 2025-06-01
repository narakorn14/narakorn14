const StudentManager = {
    mainContentElement: null,
    userRole: null, // 'admin' or 'teacher'
    teacherId: null, // For teacher role, their UID
    teacherClasses: [], // For teacher role, their assigned classes [{id: '...', name: '...'}]

    init: async function(mainContentElement, role, teacherId = null, teacherClasses = []) {
        this.mainContentElement = mainContentElement;
        this.userRole = role;
        this.teacherId = teacherId;
        this.teacherClasses = teacherClasses; // Array of class objects {id, name}

        this.renderStudentManagementUI();
    },

    renderStudentManagementUI: async function() {
        let classSelectorHTML = '';
        if (this.userRole === 'admin') {
            classSelectorHTML = `
                <div class="form-group">
                    <label for="smClassSelect">เลือกห้องเรียน:</label>
                    <select id="smClassSelectAdmin"></select>
                </div>`;
        } else if (this.userRole === 'teacher') {
            if (this.teacherClasses.length > 0) {
                let options = this.teacherClasses.map(cls => `<option value="${cls.id}">${cls.className}</option>`).join('');
                classSelectorHTML = `
                    <div class="form-group">
                        <label for="smClassSelect">เลือกห้องเรียนของคุณ:</label>
                        <select id="smClassSelectTeacher">${options}</select>
                    </div>`;
            } else {
                this.mainContentElement.innerHTML = '<h3>จัดการนักเรียน</h3><p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
                return;
            }
        }

        this.mainContentElement.innerHTML = `
            <h3>จัดการนักเรียน</h3>
            ${classSelectorHTML}
            <div id="addStudentFormContainer" style="display:none;">
                <h4>เพิ่มนักเรียนใหม่เข้าห้อง <span id="selectedClassNameForAdd"></span></h4>
                <form id="addStudentForm">
                    <input type="hidden" id="studentClassId" />
                    <div class="form-group">
                        <label for="studentId">รหัสนักเรียน:</label>
                        <input type="text" id="studentId" required>
                    </div>
                    <div class="form-group">
                        <label for="studentFirstName">ชื่อจริง:</label>
                        <input type="text" id="studentFirstName" required>
                    </div>
                    <div class="form-group">
                        <label for="studentLastName">นามสกุล:</label>
                        <input type="text" id="studentLastName" required>
                    </div>
                    <button type="submit">เพิ่มนักเรียน</button>
                    <p id="addStudentMessage"></p>
                </form>
            </div>
            <hr>
            <h4>รายชื่อนักเรียนในห้อง <span id="selectedClassNameForList"></span></h4>
            <div id="studentsList">กรุณาเลือกห้องเรียน</div>
        `;

        const classSelectElement = this.userRole === 'admin' ? document.getElementById('smClassSelectAdmin') : document.getElementById('smClassSelectTeacher');

        if (this.userRole === 'admin') {
            await this.populateAdminClassDropdown('smClassSelectAdmin');
        }

        if (classSelectElement) {
             classSelectElement.addEventListener('change', (e) => {
                const selectedClassId = e.target.value;
                const selectedClassName = e.target.options[e.target.selectedIndex].text;
                if (selectedClassId) {
                    document.getElementById('addStudentFormContainer').style.display = 'block';
                    document.getElementById('studentClassId').value = selectedClassId;
                    document.getElementById('selectedClassNameForAdd').textContent = selectedClassName;
                    document.getElementById('selectedClassNameForList').textContent = selectedClassName;
                    this.loadStudentsList(selectedClassId);
                } else {
                    document.getElementById('addStudentFormContainer').style.display = 'none';
                    document.getElementById('studentsList').innerHTML = 'กรุณาเลือกห้องเรียน';
                    document.getElementById('selectedClassNameForAdd').textContent = '';
                    document.getElementById('selectedClassNameForList').textContent = '';
                }
            });
            // Trigger change on init if a class is pre-selected (for teachers)
            if(this.userRole === 'teacher' && this.teacherClasses.length > 0){
                classSelectElement.dispatchEvent(new Event('change'));
            }
        }

        document.getElementById('addStudentForm').addEventListener('submit', this.handleAddStudent.bind(this));
    },

    populateAdminClassDropdown: async function(selectElementId) {
        const selectEl = document.getElementById(selectElementId);
        selectEl.innerHTML = '<option value="">กำลังโหลดห้องเรียน...</option>';
        try {
            const querySnapshot = await db.collection('classes').orderBy('className').get();
            if (querySnapshot.empty) {
                selectEl.innerHTML = '<option value="">ไม่มีห้องเรียนในระบบ</option>';
                return;
            }
            let optionsHtml = '<option value="">-- เลือกห้องเรียน --</option>';
            querySnapshot.forEach(doc => {
                const cls = doc.data();
                optionsHtml += `<option value="${doc.id}">${cls.className}</option>`;
            });
            selectEl.innerHTML = optionsHtml;
        } catch (error) {
            console.error("Error populating admin class dropdown:", error);
            selectEl.innerHTML = '<option value="">เกิดข้อผิดพลาด</option>';
        }
    },

    handleAddStudent: async function(event) {
        event.preventDefault();
        const classId = document.getElementById('studentClassId').value;
        const studentId = document.getElementById('studentId').value.trim();
        const firstName = document.getElementById('studentFirstName').value.trim();
        const lastName = document.getElementById('studentLastName').value.trim();
        const messageEl = document.getElementById('addStudentMessage');
        messageEl.textContent = 'กำลังดำเนินการ...';

        if (!classId || !studentId || !firstName || !lastName) {
            messageEl.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
            messageEl.style.color = 'red';
            return;
        }

        try {
            // Firestore document ID for student will be their studentId for easy lookup
            const studentRef = db.collection('students').doc(studentId);
            const studentDoc = await studentRef.get();

            if (studentDoc.exists) {
                // Check if student is already in this class or another
                const existingData = studentDoc.data();
                if (existingData.classId === classId) {
                     messageEl.textContent = `รหัสนักเรียน ${studentId} มีอยู่แล้วในห้องนี้แล้ว`;
                } else {
                     messageEl.textContent = `รหัสนักเรียน ${studentId} มีอยู่แล้วในห้องอื่น (${existingData.classId}) หากต้องการย้ายห้อง กรุณาลบออกจากห้องเดิมก่อน`;
                }
                messageEl.style.color = 'orange';
                return;
            }

            await studentRef.set({
                studentId: studentId,
                firstName: firstName,
                lastName: lastName,
                classId: classId,
                active: true // Default to active
            });

            messageEl.textContent = 'เพิ่มนักเรียนสำเร็จ!';
            messageEl.style.color = 'green';
            document.getElementById('addStudentForm').reset(); // Reset form, but keep classId selected
            document.getElementById('studentId').value = '';
            document.getElementById('studentFirstName').value = '';
            document.getElementById('studentLastName').value = '';

            await this.loadStudentsList(classId);
        } catch (error) {
            console.error("Error adding student:", error);
            messageEl.textContent = 'เกิดข้อผิดพลาด: ' + error.message;
            messageEl.style.color = 'red';
        }
    },

    loadStudentsList: async function(classId) {
        const listEl = document.getElementById('studentsList');
        listEl.innerHTML = 'กำลังโหลดรายชื่อนักเรียน...';
        try {
            const querySnapshot = await db.collection('students')
                                        .where('classId', '==', classId)
                                        .where('active', '==', true) // Only show active students
                                        .orderBy('lastName').orderBy('firstName')
                                        .get();
            if (querySnapshot.empty) {
                listEl.innerHTML = '<p>ยังไม่มีนักเรียนในห้องนี้ หรือไม่มีนักเรียนที่ยังศึกษาอยู่</p>';
                return;
            }
            let html = '<table><thead><tr><th>รหัสนักเรียน</th><th>ชื่อ</th><th>นามสกุล</th><th>จัดการ</th></tr></thead><tbody>';
            querySnapshot.forEach(doc => {
                const student = doc.data();
                html += `
                    <tr>
                        <td>${student.studentId}</td>
                        <td>${student.firstName}</td>
                        <td>${student.lastName}</td>
                        <td>
                            <button class="delete-student-btn" data-studentid="${student.studentId}" data-studentname="${student.firstName} ${student.lastName}">ลบ (ออกจากห้อง)</button>
                        </td>
                    </tr>`;
            });
            html += '</tbody></table>';
            listEl.innerHTML = html;

            // Add event listeners for delete buttons
            listEl.querySelectorAll('.delete-student-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const studentId = e.target.dataset.studentid;
                    const studentName = e.target.dataset.studentname;
                    this.handleDeleteStudent(studentId, studentName, classId);
                });
            });

        } catch (error) {
            console.error("Error loading students:", error);
            listEl.innerHTML = '<p>ไม่สามารถโหลดรายชื่อนักเรียนได้: ' + error.message + '</p>';
        }
    },

    handleDeleteStudent: async function(studentId, studentName, currentClassId) {
        // In this system, "deleting" a student might mean marking them as inactive
        // or actually removing their record if it was an error.
        // For simplicity, we'll mark as inactive (soft delete).
        // A "hard delete" option could be added for admins.
        if (confirm(`คุณต้องการ "ลบ" (ทำเครื่องหมายว่าไม่ Active) นักเรียน "${studentName}" (ID: ${studentId}) ออกจากห้องเรียนนี้ใช่หรือไม่?`)) {
            try {
                // Option 1: Mark as inactive
                await db.collection('students').doc(studentId).update({ active: false });

                // Option 2: Hard delete (USE WITH CAUTION - data loss)
                // await db.collection('students').doc(studentId).delete();

                alert(`นักเรียน "${studentName}" ถูกทำเครื่องหมายว่าไม่ Active แล้ว`);
                await this.loadStudentsList(currentClassId); // Reload list for the current class
            } catch (error) {
                console.error("Error 'deleting' student:", error);
                alert('เกิดข้อผิดพลาด: ' + error.message);
            }
        }
    }
};
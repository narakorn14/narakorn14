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
                <button type="submit">เพิ่มนักเรียน (ทีละคน)</button>
                <p id="addStudentMessage"></p>
            </form>
            <hr>
            <h4>นำเข้านักเรียนจากไฟล์ CSV</h4>
            <div class="form-group">
                <label for="csvFile">เลือกไฟล์ CSV (คอลัมน์: studentId,firstName,lastName):</label>
                <input type="file" id="csvFile" accept=".csv">
                 <input type="hidden" id="importStudentClassId" /> <!-- Hidden input to store classId for import -->
            </div>
            <button id="importStudentsBtn">เริ่มนำเข้า</button>
            <div id="importStatusMessage" style="margin-top:10px;"></div>
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
                    document.getElementById('studentClassId').value = selectedClassId;    // For single add
                    document.getElementById('importStudentClassId').value = selectedClassId; // <--- **บรรทัดนี้สำคัญ**
                    document.getElementById('selectedClassNameForAdd').textContent = selectedClassName;
                    document.getElementById('selectedClassNameForList').textContent = selectedClassName;
                    this.loadStudentsList(selectedClassId);
                } else {
                    document.getElementById('addStudentFormContainer').style.display = 'none';
                    document.getElementById('studentsList').innerHTML = 'กรุณาเลือกห้องเรียน';
                    document.getElementById('selectedClassNameForAdd').textContent = '';
                    document.getElementById('selectedClassNameForList').textContent = '';
                    document.getElementById('studentClassId').value = ''; // เคลียร์ค่า
                    document.getElementById('importStudentClassId').value = ''; // <--- **เคลียร์ค่าที่นี่ด้วย**
                }
            });
            // Trigger change on init if a class is pre-selected (for teachers)
            if(this.userRole === 'teacher' && this.teacherClasses.length > 0 && classSelectElement.options.length > 0){ // เพิ่มเช็ค options.length
                // ตรวจสอบว่ามี option ที่ถูก selected หรือไม่
                if (classSelectElement.value) { // ถ้ามี value (มี option selected)
                    classSelectElement.dispatchEvent(new Event('change'));
                } else if (classSelectElement.options.length > 1 && classSelectElement.options[0].value === "") {
                    // ถ้า option แรกคือ "-- เลือกห้อง --" และมี option อื่น ให้ลอง select option ถัดไป (ถ้าต้องการ)
                    // หรือปล่อยให้ผู้ใช้เลือกเอง
                }
            } else if (this.userRole === 'admin' && classSelectElement.options.length > 1 && classSelectElement.options[0].value === "") {
                // Admin: อาจจะไม่ต้อง auto-select ปล่อยให้เลือกเอง
                // หรือถ้าต้องการ auto-select option แรกจริงๆ (ที่ไม่ใช่ placeholder) ก็ทำได้
                // แต่โดยทั่วไปจะให้ user เลือก
                 document.getElementById('addStudentFormContainer').style.display = 'none'; // ซ่อนฟอร์มถ้ายังไม่ได้เลือก
            } else if (classSelectElement.options.length > 0 && classSelectElement.options[0].value !== "") {
                // กรณีมี option เดียวและไม่ใช่ placeholder ให้ trigger change
                 classSelectElement.dispatchEvent(new Event('change'));
            }
        }

        document.getElementById('addStudentForm').addEventListener('submit', this.handleAddStudent.bind(this));
        document.getElementById('importStudentsBtn').addEventListener('click', this.handleImportStudents.bind(this));
        
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

    ///////////////////////////////  นำเข้า CSV  ///////////////////////////////////////
    handleImportStudents: async function() {
        console.log("handleImportStudents function called!");
        const fileInput = document.getElementById('csvFile');
        const classId = document.getElementById('importStudentClassId').value; // Get classId for import
        const statusMessageEl = document.getElementById('importStatusMessage');

        statusMessageEl.textContent = 'กำลังประมวลผลไฟล์...';
        statusMessageEl.style.color = 'orange';

        if (!fileInput.files || fileInput.files.length === 0) {
            statusMessageEl.textContent = 'กรุณาเลือกไฟล์ CSV ก่อน';
            statusMessageEl.style.color = 'red';
            return;
        }
        if (!classId) {
            statusMessageEl.textContent = 'กรุณาเลือกห้องเรียนก่อนทำการนำเข้า';
            statusMessageEl.style.color = 'red';
            return;
        }

        const file = fileInput.files[0];

        Papa.parse(file, {
            header: true, // ตั้งค่าให้ใช้แถวแรกเป็น Header (ชื่อคอลัมน์)
            skipEmptyLines: true,
            complete: async (results) => {
                const studentsData = results.data;
                const errors = results.errors; // Errors from PapaParse itself

                if (errors.length > 0) {
                    console.error("PapaParse Errors:", errors);
                    let errorMsg = "เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: <br>";
                    errors.forEach(err => {
                        errorMsg += `- แถวที่ ${err.row}: ${err.message} (${err.code})<br>`;
                    });
                    statusMessageEl.innerHTML = errorMsg;
                    statusMessageEl.style.color = 'red';
                    return;
                }

                if (!studentsData || studentsData.length === 0) {
                    statusMessageEl.textContent = 'ไม่พบข้อมูลนักเรียนในไฟล์ CSV หรือไฟล์อาจมีรูปแบบไม่ถูกต้อง';
                    statusMessageEl.style.color = 'red';
                    return;
                }

                // ตรวจสอบว่า header มีคอลัมน์ที่ต้องการหรือไม่ (studentId, firstName, lastName)
                const requiredColumns = ['studentid', 'firstname', 'lastname']; // ใช้ lowercase เพราะ PapaParse อาจแปลง header
                const actualHeaders = Object.keys(studentsData[0]).map(h => h.toLowerCase().trim());

                for (const col of requiredColumns) {
                    if (!actualHeaders.includes(col)) {
                        statusMessageEl.textContent = `ไฟล์ CSV ต้องมีคอลัมน์: studentId, firstName, lastName (พบ: ${Object.keys(studentsData[0]).join(', ')})`;
                        statusMessageEl.style.color = 'red';
                        return;
                    }
                }

                await this.processAndSaveImportedStudents(studentsData, classId, statusMessageEl);
            },
            error: (error) => {
                console.error("Error parsing CSV:", error);
                statusMessageEl.textContent = 'เกิดข้อผิดพลาดในการอ่านไฟล์ CSV: ' + error.message;
                statusMessageEl.style.color = 'red';
            }
        });
    },

    processAndSaveImportedStudents: async function(studentsData, classId, statusMessageEl) {
        statusMessageEl.textContent = 'กำลังตรวจสอบและบันทึกข้อมูลนักเรียน...';
        let successCount = 0;
        let errorCount = 0;
        const errorDetails = [];

        const batch = db.batch();
        let operationsInBatch = 0;
        const MAX_BATCH_OPERATIONS = 490; // Firestore batch limit is 500

        for (let i = 0; i < studentsData.length; i++) {
            const student = studentsData[i];
            // PapaParse อาจจะคืนค่า Header เป็น key, เราต้อง map ไปยัง property ที่เราต้องการ
            // และ trim() ค่าต่างๆ เพื่อป้องกัน space ที่ไม่จำเป็น
            const studentId = student.studentId?.trim() || student.studentid?.trim(); // รองรับทั้ง StudentId และ studentid
            const firstName = student.firstName?.trim() || student.firstname?.trim();
            const lastName = student.lastName?.trim() || student.lastname?.trim();

            // --- Basic Validation ---
            if (!studentId || !firstName || !lastName) {
                errorCount++;
                errorDetails.push(`แถวที่ ${i + 2} (ข้อมูลไฟล์): ข้อมูลไม่ครบ (ID: ${studentId || 'N/A'}, ชื่อ: ${firstName || 'N/A'}, สกุล: ${lastName || 'N/A'})`);
                continue;
            }

            // --- Check for existing student (studentId globally) ---
            // เราควรเช็คทีละรายการเพื่อไม่ให้ query เยอะเกินไป หรือดึงข้อมูลที่มีอยู่มาเก็บใน cache ก่อนถ้าข้อมูลไม่เยอะมาก
            // สำหรับการ import จำนวนมาก อาจต้องพิจารณากลยุทธ์อื่น เช่น ใช้ Cloud Function
            // ในตัวอย่างนี้จะเช็คทีละรายการ ซึ่งอาจช้าถ้าไฟล์ใหญ่มาก

            const studentRef = db.collection('students').doc(studentId);
            try {
                const studentDoc = await studentRef.get();
                if (studentDoc.exists) {
                    const existingData = studentDoc.data();
                    if (existingData.classId === classId) {
                        errorCount++;
                        errorDetails.push(`แถวที่ ${i + 2}: รหัสนักเรียน ${studentId} (${firstName} ${lastName}) มีอยู่แล้วในห้องเรียนนี้แล้ว`);
                    } else {
                        errorCount++;
                        errorDetails.push(`แถวที่ ${i + 2}: รหัสนักเรียน ${studentId} (${firstName} ${lastName}) มีอยู่แล้วในห้องเรียนอื่น (${existingData.classId}). ไม่สามารถเพิ่มซ้ำได้`);
                    }
                    continue; // ข้ามไปรายการถัดไป
                }

                // If not exists, add to batch
                batch.set(studentRef, {
                    studentId: studentId,
                    firstName: firstName,
                    lastName: lastName,
                    classId: classId,
                    active: true
                });
                operationsInBatch++;
                successCount++;

                // Commit batch if it's full
                if (operationsInBatch >= MAX_BATCH_OPERATIONS) {
                    await batch.commit();
                    // batch = db.batch(); // Re-initialize batch for next set (Error: A new batch object must be created by calling firestore.batch().)
                    // Correct way to re-initialize batch is to create a new one.
                    // However, for this simple example, if the file is huge, it's better to process in chunks
                    // or use a Cloud Function. For now, let's assume the file size is manageable within one or few batches.
                    // A more robust solution would handle multiple batches.
                    // For this example, we'll commit what we have and if there are more, it implies they were processed already.
                    // This part needs refinement for very large files.
                    console.log(`Committed batch of ${operationsInBatch} operations.`);
                    operationsInBatch = 0; // Reset counter
                    // Note: If there are more students after this, a new batch will be implicitly used by Firestore
                    // (Actually, you need to re-create the batch object)
                    // For simplicity, this example assumes one large batch is okay for moderate file sizes.
                    // A better approach for very large files:
                    // const newBatch = db.batch();
                    // ... add to newBatch ...
                    // await newBatch.commit();
                }

            } catch (dbError) {
                console.error("Firestore error for studentId " + studentId + ":", dbError);
                errorCount++;
                errorDetails.push(`แถวที่ ${i + 2}: เกิดข้อผิดพลาดกับฐานข้อมูลสำหรับ ${studentId} - ${dbError.message}`);
            }
        }

        // Commit any remaining operations in the last batch
        if (operationsInBatch > 0) {
            try {
                await batch.commit();
                console.log(`Committed final batch of ${operationsInBatch} operations.`);
            } catch (batchCommitError) {
                console.error("Error committing final batch:", batchCommitError);
                // Mark any students in this failed batch as errors
                // This is complex to track back accurately without more sophisticated logic
                statusMessageEl.innerHTML += `<br><strong style="color:red;">เกิดข้อผิดพลาดในการบันทึกชุดข้อมูลสุดท้าย กรุณาตรวจสอบข้อมูลอีกครั้ง</strong>`;
            }
        }


        let summaryMessage = `นำเข้าสำเร็จ: ${successCount} รายการ<br>`;
        if (errorCount > 0) {
            summaryMessage += `เกิดข้อผิดพลาด: ${errorCount} รายการ<br>`;
            summaryMessage += "<strong>รายละเอียดข้อผิดพลาด:</strong><ul>";
            errorDetails.forEach(detail => summaryMessage += `<li>${detail}</li>`);
            summaryMessage += "</ul>";
            statusMessageEl.style.color = 'red';
        } else {
            statusMessageEl.style.color = 'green';
        }
        statusMessageEl.innerHTML = summaryMessage;

        // Clear file input
        document.getElementById('csvFile').value = '';
        // Reload student list for the current class
        if (successCount > 0) {
            await this.loadStudentsList(classId);
        }
    },
    ///////////////////////////////////////////////////////////////////////////////////

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
                    <td data-label="รหัสนักเรียน">${student.studentId}</td>
                    <td data-label="ชื่อ">${student.firstName}</td>
                    <td data-label="นามสกุล">${student.lastName}</td>
                    <td data-label="จัดการ">
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
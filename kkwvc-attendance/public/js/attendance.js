const Attendance = {
    mainContentElement: null,
    currentClassId: null,
    currentTeacherId: null,
    currentDate: new Date().toISOString().slice(0,10), // YYYY-MM-DD

    showAttendanceForm: async function(mainContentElement, classId, teacherId) {
        this.mainContentElement = mainContentElement;
        this.currentClassId = classId;
        this.currentTeacherId = teacherId;

        const classDoc = await db.collection('classes').doc(classId).get();
        const className = classDoc.exists ? classDoc.data().className : "ไม่พบชื่อห้อง";

        this.mainContentElement.innerHTML = `
            <h3>เช็คชื่อนักเรียน - ห้อง ${className} (ID: ${classId})</h3>
            <div class="form-group">
                <label for="attendanceDate">วันที่เช็คชื่อ:</label>
                <input type="date" id="attendanceDate" value="${this.currentDate}">
            </div>
            <div id="attendanceStudentList">กำลังโหลดรายชื่อนักเรียน...</div>
            <button id="submitAttendanceBtn" style="margin-top: 20px;">บันทึกการเช็คชื่อ</button>
            <p id="attendanceMessage"></p>
        `;

        document.getElementById('attendanceDate').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.loadStudentsForAttendance(classId, this.currentDate); // Reload list for new date
        });

        document.getElementById('submitAttendanceBtn').addEventListener('click', this.handleSubmitAttendance.bind(this));

        await this.loadStudentsForAttendance(classId, this.currentDate);
    },

    loadStudentsForAttendance: async function(classId, date) {
        const listEl = document.getElementById('attendanceStudentList');
        listEl.innerHTML = 'กำลังโหลด...';
        try {
            const studentsSnapshot = await db.collection('students')
                                           .where('classId', '==', classId)
                                           .where('active', '==', true)
                                           .orderBy('studentId')
                                           .get();

            if (studentsSnapshot.empty) {
                listEl.innerHTML = '<p>ไม่มีนักเรียนในห้องนี้</p>';
                document.getElementById('submitAttendanceBtn').style.display = 'none';
                return;
            }
             document.getElementById('submitAttendanceBtn').style.display = 'block';


            // Fetch existing attendance for this class and date to pre-fill statuses
            const attendanceSnapshot = await db.collection('attendance_records')
                                             .where('classId', '==', classId)
                                             .where('date', '==', date)
                                             .get();
            const existingRecords = {};
            attendanceSnapshot.forEach(doc => {
                existingRecords[doc.data().studentId] = doc.data().status;
            });


            let html = '<table class="student-table"><thead><tr><th>รหัสนักเรียน</th><th>ชื่อ-นามสกุล</th><th>สถานะ</th></tr></thead><tbody>';
            studentsSnapshot.forEach(doc => {
                const student = doc.data();
                const studentFullName = `${student.firstName} ${student.lastName}`;
                const currentStatus = existingRecords[student.studentId] || 'present'; // Default to 'present'

                html += `
                    <tr data-studentid="${student.studentId}">
                        <td>${student.studentId}</td>
                        <td>${studentFullName}</td>
                        <td class="status-cell ${currentStatus}">
                            <select class="status-select">
                                <option value="present" ${currentStatus === 'present' ? 'selected' : ''}>มา</option>
                                <option value="absent" ${currentStatus === 'absent' ? 'selected' : ''}>ไม่มา</option>
                                <option value="late" ${currentStatus === 'late' ? 'selected' : ''}>สาย</option>
                                <option value="leave" ${currentStatus === 'leave' ? 'selected' : ''}>ลา</option>
                            </select>
                        </td>
                    </tr>`;
            });
            html += '</tbody></table>';
            listEl.innerHTML = html;
            document.addEventListener('change', function (e) {
                if (e.target.classList.contains('status-select')) {
                    const select = e.target;
                    const td = select.closest('td');
                    td.className = 'status-cell ' + select.value;
                }
            });
            

        } catch (error) {
            console.error("Error loading students for attendance:", error);
            listEl.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message + '</p>';
             document.getElementById('submitAttendanceBtn').style.display = 'none';
        }
    },

    handleSubmitAttendance: async function() {
        const messageEl = document.getElementById('attendanceMessage');
        messageEl.textContent = 'กำลังบันทึก...';
        messageEl.style.color = 'orange';

        const attendanceDate = document.getElementById('attendanceDate').value;
        if (!attendanceDate) {
            messageEl.textContent = 'กรุณาเลือกวันที่';
            messageEl.style.color = 'red';
            return;
        }

        const studentRows = document.querySelectorAll('#attendanceStudentList tbody tr');
        if (studentRows.length === 0) {
            messageEl.textContent = 'ไม่มีนักเรียนให้เช็คชื่อ';
            messageEl.style.color = 'red';
            return;
        }

        const batch = db.batch();
        let recordsToSave = 0;

        for (const row of studentRows) {
            const studentId = row.dataset.studentid;
            const status = row.querySelector('.status-select').value;

            // Create a unique ID for attendance record if needed, or let Firestore auto-generate
            // For simplicity, we'll find if a record for this student/date/class exists and update, else create.

            // Query for existing record to update or create new
            const attendanceQuery = db.collection('attendance_records')
                .where('classId', '==', this.currentClassId)
                .where('studentId', '==', studentId)
                .where('date', '==', attendanceDate);

            const querySnapshot = await attendanceQuery.get();

            const recordData = {
                classId: this.currentClassId,
                studentId: studentId,
                date: attendanceDate,
                status: status,
                markedBy: this.currentTeacherId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
            };

            if (querySnapshot.empty) {
                // No existing record, create a new one
                const newRecordRef = db.collection('attendance_records').doc(); // Auto-generate ID
                batch.set(newRecordRef, recordData);
            } else {
                // Existing record found, update it
                // (Should be only one, but loop just in case of data inconsistency)
                querySnapshot.forEach(doc => {
                    batch.update(doc.ref, recordData);
                });
            }
            recordsToSave++;
        }

        try {
            if (recordsToSave > 0) {
                await batch.commit();
                messageEl.textContent = 'บันทึกการเช็คชื่อสำเร็จ!';
                messageEl.style.color = 'green';
            } else {
                messageEl.textContent = 'ไม่มีข้อมูลให้บันทึก';
                messageEl.style.color = 'orange';
            }
             // Optionally, reload the list to show persisted data (though it should be pre-filled already)
             // await this.loadStudentsForAttendance(this.currentClassId, attendanceDate);
        } catch (error) {
            console.error("Error submitting attendance:", error);
            messageEl.textContent = 'เกิดข้อผิดพลาดในการบันทึก: ' + error.message;
            messageEl.style.color = 'red';
        }
    }
};
const Report = {
    mainContentElement: null,
    userRole: null,
    teacherId: null, // If role is teacher
    teacherClassesDetails: [], // If role is teacher [{id, name}]

    showReportUI: async function(mainContentElement, role, teacherId = null, teacherClassesDetails = []) {
        this.mainContentElement = mainContentElement;
        this.userRole = role;
        this.teacherId = teacherId;
        this.teacherClassesDetails = teacherClassesDetails; // Array of {id, name}

        let classFilterHTML = '';
        if (this.userRole === 'admin') {
            classFilterHTML = `
                <div class="form-group">
                    <label for="reportClassSelectAdmin">เลือกห้องเรียน:</label>
                    <select id="reportClassSelectAdmin">
                        <option value="">-- ทุกห้องเรียน --</option>
                    </select>
                </div>`;
        } else if (this.userRole === 'teacher') {
            if (this.teacherClassesDetails.length > 0) {
                let options = this.teacherClassesDetails.map(cls => `<option value="${cls.id}">${cls.className}</option>`).join('');
                classFilterHTML = `
                    <div class="form-group">
                        <label for="reportClassSelectTeacher">เลือกห้องเรียนของคุณ:</label>
                        <select id="reportClassSelectTeacher">
                            <option value="">-- ทุกห้องของคุณ --</option>
                            ${options}
                        </select>
                    </div>`;
            } else {
                classFilterHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
            }
        }


        this.mainContentElement.innerHTML = `
            <h2>รายงานการเข้าเรียน</h2>
            <div class="report-filters">
                ${classFilterHTML}
                <div class="form-group">
                    <label for="reportStartDate">ตั้งแต่วันที่:</label>
                    <input type="date" id="reportStartDate" value="${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)}">
                </div>
                <div class="form-group">
                    <label for="reportEndDate">ถึงวันที่:</label>
                    <input type="date" id="reportEndDate" value="${new Date().toISOString().slice(0,10)}">
                </div>
                <div class="form-group">
                    <label for="reportStudentId">รหัสนักเรียน (ถ้าต้องการดูรายคน):</label>
                    <input type="text" id="reportStudentId" placeholder="เว้นว่างถ้าไม่ระบุ">
                </div>
                <button id="generateReportBtn">สร้างรายงาน</button>
            </div>
            <div id="reportResultArea">
                <p>กรุณาเลือกเงื่อนไขและกด "สร้างรายงาน"</p>
            </div>
        `;

        if (this.userRole === 'admin') {
            await this.populateAdminClassDropdownForReport('reportClassSelectAdmin');
        }

        document.getElementById('generateReportBtn').addEventListener('click', this.generateReport.bind(this));
    },

    populateAdminClassDropdownForReport: async function(selectElementId) {
        const selectEl = document.getElementById(selectElementId);
        // Keep the "all classes" option
        let currentOptions = selectEl.innerHTML;
        selectEl.innerHTML = '<option value="">กำลังโหลดห้องเรียน...</option>';

        try {
            const querySnapshot = await db.collection('classes').orderBy('className').get();
             let optionsHtml = '<option value="">-- ทุกห้องเรียน --</option>'; // Default for all
            querySnapshot.forEach(doc => {
                const cls = doc.data();
                optionsHtml += `<option value="${doc.id}">${cls.className}</option>`;
            });
            selectEl.innerHTML = optionsHtml;
        } catch (error) {
            console.error("Error populating admin class dropdown for report:", error);
            selectEl.innerHTML = '<option value="">-- ทุกห้องเรียน --</option><option value="">เกิดข้อผิดพลาด</option>';
        }
    },


    generateReport: async function() {
        const reportResultArea = document.getElementById('reportResultArea');
        reportResultArea.innerHTML = '<p>กำลังสร้างรายงาน...</p>';

        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const specificStudentId = document.getElementById('reportStudentId').value.trim();

        let selectedClassId = '';
        if (this.userRole === 'admin') {
            selectedClassId = document.getElementById('reportClassSelectAdmin')?.value || '';
        } else if (this.userRole === 'teacher') {
            selectedClassId = document.getElementById('reportClassSelectTeacher')?.value || '';
        }


        if (!startDate || !endDate) {
            reportResultArea.innerHTML = '<p style="color:red;">กรุณาเลือกช่วงวันที่</p>';
            return;
        }

        let query = db.collection('attendance_records');

        // Date filtering
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);

        // Class filtering
        if (selectedClassId) {
            query = query.where('classId', '==', selectedClassId);
        } else if (this.userRole === 'teacher') {
            // Teacher viewing "all their classes"
            if (this.teacherClassesDetails.length > 0) {
                const teacherClassIds = this.teacherClassesDetails.map(cls => cls.id);
                if (teacherClassIds.length > 0 && teacherClassIds.length <= 30) { // Firestore 'in' query limit is 30
                     query = query.where('classId', 'in', teacherClassIds);
                } else if (teacherClassIds.length > 30) {
                    reportResultArea.innerHTML = '<p style="color:red;">คุณมีห้องเรียนที่รับผิดชอบมากเกินไปสำหรับดูพร้อมกัน กรุณาเลือกทีละห้อง</p>';
                    return;
                } else { // No classes assigned
                    reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
                    return;
                }
            } else {
                reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
                return;
            }
        }
        // Admin not selecting a class means all classes - no additional class filter needed.


        // Student filtering
        if (specificStudentId) {
            query = query.where('studentId', '==', specificStudentId);
        }

        // Order by date, then class, then student (optional)
        query = query.orderBy('date', 'desc').orderBy('classId').orderBy('studentId');


        try {
            const attendanceSnapshot = await query.get();

            if (attendanceSnapshot.empty) {
                reportResultArea.innerHTML = '<p>ไม่พบข้อมูลการเข้าเรียนตามเงื่อนไขที่เลือก</p>';
                return;
            }

            // Fetch student and class names for better display (can be performance intensive for large reports)
            // Consider doing this on-demand or pre-fetching common data
            const studentCache = {};
            const classCache = {};

            // Collect all unique student IDs and class IDs from the results
            const studentIdsToFetch = new Set();
            const classIdsToFetch = new Set();
            attendanceSnapshot.forEach(doc => {
                studentIdsToFetch.add(doc.data().studentId);
                classIdsToFetch.add(doc.data().classId);
            });

            // Fetch student details
            if (studentIdsToFetch.size > 0) {
                // Firestore 'in' query limit is 30. If more, batch requests or fetch one by one (less efficient)
                const studentIdBatches = [];
                const studentIdArray = Array.from(studentIdsToFetch);
                for (let i = 0; i < studentIdArray.length; i += 30) {
                    studentIdBatches.push(studentIdArray.slice(i, i + 30));
                }
                for (const batch of studentIdBatches) {
                    if (batch.length > 0) {
                        const studentsSnap = await db.collection('students').where(firebase.firestore.FieldPath.documentId(), 'in', batch).get();
                        studentsSnap.forEach(sDoc => studentCache[sDoc.id] = sDoc.data());
                    }
                }
            }

            // Fetch class details
            if (classIdsToFetch.size > 0) {
                 const classIdBatches = [];
                const classIdArray = Array.from(classIdsToFetch);
                for (let i = 0; i < classIdArray.length; i += 30) {
                    classIdBatches.push(classIdArray.slice(i, i + 30));
                }
                for (const batch of classIdBatches) {
                    if (batch.length > 0) {
                        const classesSnap = await db.collection('classes').where(firebase.firestore.FieldPath.documentId(), 'in', batch).get();
                        classesSnap.forEach(cDoc => classCache[cDoc.id] = cDoc.data());
                    }
                }
            }


            let html = `<h4>รายงานระหว่างวันที่ ${startDate} ถึง ${endDate}</h4>`;
            html += '<table><thead><tr><th>วันที่</th><th>ห้องเรียน</th><th>รหัสนักเรียน</th><th>ชื่อ-สกุล</th><th>สถานะ</th><th>ผู้บันทึก</th></tr></thead><tbody>';

            const statusTranslations = {
                present: 'มา',
                absent: 'ไม่มา',
                late: 'สาย',
                leave: 'ลา'
            };

            for (const doc of attendanceSnapshot.docs) {
                const record = doc.data();
                const studentInfo = studentCache[record.studentId] || { studentId: record.studentId, firstName: 'N/A', lastName: '' };
                const classInfo = classCache[record.classId] || { classId: record.classId, className: 'N/A' };
                const teacherInfo = record.markedBy ? (await db.collection('users').doc(record.markedBy).get()).data()?.displayName || record.markedBy.substring(0,8) : 'N/A';

                html += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${classInfo.className} (${classInfo.classId})</td>
                        <td>${studentInfo.studentId}</td>
                        <td>${studentInfo.firstName} ${studentInfo.lastName}</td>
                        <td>${statusTranslations[record.status] || record.status}</td>
                        <td>${teacherInfo}</td>
                    </tr>`;
            }
            html += '</tbody></table>';
            reportResultArea.innerHTML = html;

        } catch (error) {
            console.error("Error generating report:", error);
            reportResultArea.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาดในการสร้างรายงาน: ${error.message}</p>`;
        }
    }
};
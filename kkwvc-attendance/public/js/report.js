const Report = {
    mainContentElement: null,
    userRole: null,
    teacherId: null,
    teacherClassesDetails: [], // Array of {id, className}
    debounceTimeout: null,
    currentReportData: [], // To store data for CSV export

    // --- Initialize UI and Event Listeners ---
    showReportUI: async function(mainContentElement, role, teacherId = null, teacherClassesDetails = []) {
        this.mainContentElement = mainContentElement;
        this.userRole = role;
        this.teacherId = teacherId;
        this.teacherClassesDetails = (teacherClassesDetails || []).map(cls => ({
            id: cls.id || cls.classId,
            className: cls.className || cls.name || 'N/A'
        }));
        this.currentReportData = []; // Reset data

        this.renderReportPage(); // Render the basic page structure

        if (this.userRole === 'admin') {
            if (document.getElementById('reportClassSelectAdmin')) {
                await this.populateAdminClassDropdown('reportClassSelectAdmin');
            }
            const adminGenerateBtn = document.getElementById('generateReportBtnAdmin');
            if (adminGenerateBtn) {
                adminGenerateBtn.addEventListener('click', () => this.fetchAndDisplayReport());
            }
             const reportResultArea = document.getElementById('reportResultArea');
             if(reportResultArea) reportResultArea.innerHTML = `<p>เลือกตัวกรองแล้วกด "สร้างรายงาน"</p>`;

        } else if (this.userRole === 'teacher') {
            this.attachTeacherEventListeners();
            if (this.teacherClassesDetails.length > 0) {
                await this.fetchAndDisplayReport(); // Load initial report for teacher
            } else {
                const reportResultArea = document.getElementById('reportResultArea');
                if (reportResultArea) reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
            }
            // Attach event listener for export button (only for teacher)
            const exportBtn = document.getElementById('exportReportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportDataToCSV());
            }
        }
    },

    renderReportPage: function() {
        let classFilterHTML = '';
        // Admin class filter
        if (this.userRole === 'admin') {
            classFilterHTML = `
                <div class="form-group">
                    <label for="reportClassSelectAdmin">เลือกห้องเรียน:</label>
                    <select id="reportClassSelectAdmin">
                        <option value="">-- ทุกห้องเรียน --</option>
                    </select>
                </div>`;
        }
        // Teacher class filter
        else if (this.userRole === 'teacher') {
            if (this.teacherClassesDetails.length > 0) {
                const sortedClasses = [...this.teacherClassesDetails].sort((a, b) => a.className.localeCompare(b.className));
                let options = sortedClasses.map(cls => `<option value="${cls.id}">${cls.className}</option>`).join('');
                const disableAllRoomsOption = this.teacherClassesDetails.length > 10;
                classFilterHTML = `
                    <div class="form-group">
                        <label for="reportClassSelectTeacher">เลือกห้องเรียน:</label>
                        <select id="reportClassSelectTeacher">
                            <option value="" ${disableAllRoomsOption ? 'disabled' : ''}>
                                ${disableAllRoomsOption ? '-- เลือกห้องเรียน (มีห้องเกิน 10) --' : '-- ทุกห้องของคุณ --'}
                            </option>
                            ${options}
                        </select>
                    </div>`;
            } else {
                classFilterHTML = ''; // No class filter if teacher has no classes
            }
        }

        const today = new Date();
        const defaultEndDate = today.toISOString().slice(0,10);
        const sevenDaysAgo = new Date(new Date().setDate(today.getDate() - 7));
        const defaultStartDate = sevenDaysAgo.toISOString().slice(0,10);

        this.mainContentElement.innerHTML = `
            <h2>รายงานการเข้าเรียน ${this.userRole === 'teacher' ? '(ของฉัน)' : ''}</h2>
            <div class="report-filters">
                ${classFilterHTML}
                <div class="form-group">
                    <label for="reportStartDate">ตั้งแต่วันที่:</label>
                    <input type="date" id="reportStartDate" value="${defaultStartDate}">
                </div>
                <div class="form-group">
                    <label for="reportEndDate">ถึงวันที่:</label>
                    <input type="date" id="reportEndDate" value="${defaultEndDate}">
                </div>
                <div class="form-group">
                    <label for="reportStudentId">รหัสนักเรียน (ถ้าต้องการ):</label>
                    <input type="text" id="reportStudentId" placeholder="เว้นว่างถ้าไม่ระบุ">
                </div>
                ${this.userRole === 'admin' ? '<button id="generateReportBtnAdmin" class="btn btn-primary">สร้างรายงาน</button>' : ''}
                ${this.userRole === 'teacher' && this.teacherClassesDetails.length > 0 ? '<button id="exportReportBtn" class="btn btn-success"><i class="fas fa-file-csv"></i> Export to CSV</button>' : ''}
            </div>
            <div id="reportResultArea">
                 <p>กำลังเตรียมข้อมูล...</p>
            </div>
        `;
    },

    populateAdminClassDropdown: async function(selectElementId) {
        // ... (โค้ดเดิมจากตัวอย่างที่แล้ว) ...
        const selectEl = document.getElementById(selectElementId);
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">กำลังโหลดห้องเรียน...</option>';
        try {
            const querySnapshot = await db.collection('classes').orderBy('className').get();
            let optionsHtml = '<option value="">-- ทุกห้องเรียน --</option>';
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

    attachTeacherEventListeners: function() {
        const classSelect = document.getElementById('reportClassSelectTeacher');
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');
        const studentIdInput = document.getElementById('reportStudentId');

        const triggerReport = () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.fetchAndDisplayReport();
            }, 500);
        };

        if (classSelect) classSelect.addEventListener('change', triggerReport);
        if (startDateInput) startDateInput.addEventListener('change', triggerReport);
        if (endDateInput) endDateInput.addEventListener('change', triggerReport);
        if (studentIdInput) studentIdInput.addEventListener('input', triggerReport);
    },

    // --- Fetch and Display Report Data ---
    fetchAndDisplayReport: async function() {
        const reportResultArea = document.getElementById('reportResultArea');
        if (!reportResultArea) return;
        reportResultArea.innerHTML = '<div class="loading-spinner"></div><p>กำลังโหลดรายงาน...</p>';
        this.currentReportData = []; // Clear previous data

        const startDateElem = document.getElementById('reportStartDate');
        const endDateElem = document.getElementById('reportEndDate');
        const studentIdElem = document.getElementById('reportStudentId');

        if (!startDateElem || !endDateElem) {
            reportResultArea.innerHTML = '<p style="color:red;">ข้อผิดพลาด: ไม่พบช่องเลือกวันที่</p>';
            return;
        }
        const startDate = startDateElem.value;
        const endDate = endDateElem.value;
        const specificStudentId = studentIdElem ? studentIdElem.value.trim() : "";

        let selectedClassId = '';
        if (this.userRole === 'admin') {
            const adminSelect = document.getElementById('reportClassSelectAdmin');
            selectedClassId = adminSelect ? adminSelect.value : '';
        } else if (this.userRole === 'teacher') {
            const teacherSelect = document.getElementById('reportClassSelectTeacher');
            selectedClassId = teacherSelect ? teacherSelect.value : '';
            if (teacherSelect && teacherSelect.value === "" && this.teacherClassesDetails.length > 10) {
                 reportResultArea.innerHTML = `
                        <p style="color:orange;">คุณรับผิดชอบห้องเรียนมากกว่า 10 ห้อง</p>
                        <p>กรุณาเลือกดูรายงานทีละห้องจากเมนู "เลือกห้องเรียน" ด้านบน</p>`;
                 return;
            }
        }

        if (!startDate || !endDate) {
            reportResultArea.innerHTML = '<p style="color:red;">กรุณาเลือกช่วงวันที่</p>';
            return;
        }

        let query = db.collection('attendance_records')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate);

        if (selectedClassId) {
            query = query.where('classId', '==', selectedClassId);
        } else if (this.userRole === 'teacher') {
            if (this.teacherClassesDetails.length > 0) {
                const teacherClassIds = this.teacherClassesDetails.map(cls => cls.id);
                if (teacherClassIds.length > 0 && teacherClassIds.length <= 10) {
                    query = query.where('classId', 'in', teacherClassIds);
                } else if (teacherClassIds.length > 10) { // This case handled by dropdown logic now
                    // This specific else-if might not be strictly needed if dropdown is disabled
                    // but kept for safety.
                     reportResultArea.innerHTML = `
                        <p style="color:orange;">คุณรับผิดชอบห้องเรียนมากกว่า 10 ห้อง</p>
                        <p>กรุณาเลือกดูรายงานทีละห้องจากเมนู "เลือกห้องเรียน" ด้านบน</p>`;
                    return;
                } else {
                    reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
                    return;
                }
            } else {
                 reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
                return;
            }
        }

        if (specificStudentId) {
            query = query.where('studentId', '==', specificStudentId);
        }
        // Note: The index from previous error should cover this: classId (ASC), date (DESC), studentId (ASC)
        // If classId is not filtered (e.g. Admin all classes), an index on date (DESC), studentId (ASC) might be needed.
        // For simplicity, we assume the existing complex index will be used or adapted.
        query = query.orderBy('date', 'desc');
        if (selectedClassId) query = query.orderBy('studentId'); // Only order by studentId if class is fixed.
        else query = query.orderBy('classId').orderBy('studentId');


        try {
            const attendanceSnapshot = await query.get();
            if (attendanceSnapshot.empty) {
                reportResultArea.innerHTML = '<p>ไม่พบข้อมูลการเข้าเรียนตามเงื่อนไขที่เลือก</p>';
                return;
            }

            const { studentCache, classCache, teacherNameCache } = await this.fetchRelatedDataForReport(attendanceSnapshot);
            this.currentReportData = this.prepareDataForTableAndExport(attendanceSnapshot, studentCache, classCache, teacherNameCache);
            this.renderReportTable(reportResultArea, this.currentReportData, startDate, endDate, selectedClassId, classCache);

        } catch (error) {
            console.error("Error generating report:", error);
            if (error.message.includes("index")) {
                 reportResultArea.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาด: Query ต้องการ Index ที่ Firestore. กรุณาตรวจสอบ Console ของ Browser สำหรับ Link สร้าง Index และสร้าง Index นั้นใน Firebase Console.</p><p><small>${error.message}</small></p>`;
            } else {
                reportResultArea.innerHTML = `<p style="color:red;">เกิดข้อผิดพลาดในการสร้างรายงาน: ${error.message}</p>`;
            }
        }
    },

    fetchRelatedDataForReport: async function(attendanceSnapshot) {
        // ... (โค้ดเดิมจากตัวอย่างที่แล้ว, ไม่มีการเปลี่ยนแปลง) ...
        const studentCache = {};
        const classCache = {};
        const teacherNameCache = {};
        const studentIdsToFetch = new Set();
        const classIdsToFetch = new Set();
        const teacherIdsToFetch = new Set();
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            studentIdsToFetch.add(data.studentId);
            classIdsToFetch.add(data.classId);
            if (data.markedBy) teacherIdsToFetch.add(data.markedBy);
        });
        const fetchInBatches = async (collectionName, ids) => {
            const cache = {};
            const idArray = Array.from(ids);
            for (let i = 0; i < idArray.length; i += 10) {
                const batchIds = idArray.slice(i, i + 10);
                if (batchIds.length > 0) {
                    const snapshot = await db.collection(collectionName).where(firebase.firestore.FieldPath.documentId(), 'in', batchIds).get();
                    snapshot.forEach(sDoc => cache[sDoc.id] = sDoc.data());
                }
            }
            return cache;
        };
        if (studentIdsToFetch.size > 0) Object.assign(studentCache, await fetchInBatches('students', studentIdsToFetch));
        if (classIdsToFetch.size > 0) Object.assign(classCache, await fetchInBatches('classes', classIdsToFetch));
        if (teacherIdsToFetch.size > 0) Object.assign(teacherNameCache, await fetchInBatches('users', teacherIdsToFetch));
        return { studentCache, classCache, teacherNameCache };
    },

    prepareDataForTableAndExport: function(attendanceSnapshot, studentCache, classCache, teacherNameCache) {
        const statusTranslations = { present: 'มา', absent: 'ไม่มา', late: 'สาย', leave: 'ลา' };
        const reportData = [];

        attendanceSnapshot.forEach(doc => {
            const record = doc.data();
            const studentData = studentCache[record.studentId] || {};
            const classData = classCache[record.classId] || {};
            const teacherData = teacherNameCache[record.markedBy] || {};

            reportData.push({
                date: record.date,
                className: classData.className || 'N/A',
                classId: record.classId,
                studentId: record.studentId,
                studentFirstName: studentData.firstName || 'N/A',
                studentLastName: studentData.lastName || '',
                status: statusTranslations[record.status] || record.status,
                markedBy: teacherData.displayName || (record.markedBy ? record.markedBy.substring(0,8) : 'N/A')
            });
        });
        return reportData; // This data will be used for both table and CSV
    },

    renderReportTable: function(reportResultArea, reportData, startDate, endDate, selectedClassId, allClassCache) {
        let html = `<h4>รายงานระหว่างวันที่ ${startDate} ถึง ${endDate}</h4>`;
        if (selectedClassId && allClassCache[selectedClassId]) {
            html += `<p><strong>ห้องเรียน:</strong> ${allClassCache[selectedClassId].className}</p>`;
        } else if (!selectedClassId && this.userRole === 'teacher' && this.teacherClassesDetails.length > 0 && this.teacherClassesDetails.length <= 10) {
            html += `<p><strong>ห้องเรียน:</strong> ทุกห้องของคุณ</p>`;
        }

        html += '<div class="table-responsive-wrapper spreadsheet-style">'; // Add spreadsheet-style class
        html += '<table><thead><tr><th>วันที่</th><th>ห้องเรียน</th><th>รหัสนักเรียน</th><th>ชื่อจริง</th><th>นามสกุล</th><th>สถานะ</th><th>ผู้บันทึก</th></tr></thead><tbody>';

        if (reportData.length === 0) {
            html += '<tr><td colspan="7" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
        } else {
            reportData.forEach(item => {
                html += `
                    <tr>
                        <td>${item.date}</td>
                        <td>${item.className} (${item.classId})</td>
                        <td>${item.studentId}</td>
                        <td>${item.studentFirstName}</td>
                        <td>${item.studentLastName}</td>
                        <td>${item.status}</td>
                        <td>${item.markedBy}</td>
                    </tr>`;
            });
        }

        html += '</tbody></table></div>';
        reportResultArea.innerHTML = html;
    },

    // --- CSV Export Functionality (for Teacher) ---
    exportDataToCSV: function() {
        if (this.currentReportData.length === 0) {
            alert("ไม่มีข้อมูลให้ Export");
            return;
        }

        const headers = ["วันที่", "รหัสห้องเรียน", "ชื่อห้องเรียน", "รหัสนักเรียน", "ชื่อจริง", "นามสกุล", "สถานะ", "ผู้บันทึก"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        this.currentReportData.forEach(item => {
            // Escape commas within fields if any (though unlikely for these fields)
            const escapeCSV = (field) => {
                if (typeof field === 'string' && field.includes(',')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };
            const row = [
                item.date,
                item.classId,
                escapeCSV(item.className),
                item.studentId,
                escapeCSV(item.studentFirstName),
                escapeCSV(item.studentLastName),
                item.status,
                escapeCSV(item.markedBy)
            ];
            csvContent += row.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `รายงานการเข้าเรียน_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);
    }
};
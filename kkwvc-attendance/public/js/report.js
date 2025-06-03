const Report = {
    mainContentElement: null,
    userRole: null,
    teacherId: null,
    teacherClassesDetails: [],
    debounceTimeout: null,
    currentReportData: [], // Stores raw data for CSV export and pivot transformation

    // --- Initialize UI and Event Listeners ---
    showReportUI: async function(mainContentElement, role, teacherId = null, teacherClassesDetails = []) {
        this.mainContentElement = mainContentElement;
        this.userRole = role;
        this.teacherId = teacherId;
        this.teacherClassesDetails = (teacherClassesDetails || []).map(cls => ({
            id: cls.id || cls.classId,
            className: cls.className || cls.name || 'N/A'
        }));
        this.currentReportData = [];

        this.renderReportPage();

        if (this.userRole === 'admin') {
            if (document.getElementById('reportClassSelectAdmin')) {
                await this.populateAdminClassDropdown('reportClassSelectAdmin');
            }
            const adminGenerateBtn = document.getElementById('generateReportBtnAdmin');
            if (adminGenerateBtn) {
                adminGenerateBtn.addEventListener('click', () => this.fetchAndDisplayReport());
            }
            const reportResultArea = document.getElementById('reportResultArea');
            if (reportResultArea) reportResultArea.innerHTML = `<p>เลือกตัวกรองแล้วกด "สร้างรายงาน"</p>`;

        } else if (this.userRole === 'teacher') {
            this.attachTeacherEventListeners();
            if (this.teacherClassesDetails.length > 0) {
                await this.fetchAndDisplayReport();
            } else {
                const reportResultArea = document.getElementById('reportResultArea');
                if (reportResultArea) reportResultArea.innerHTML = '<p>คุณไม่ได้รับผิดชอบห้องเรียนใดๆ</p>';
            }
            const exportBtn = document.getElementById('exportReportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportDataToCSV());
            }
        }
    },

    renderReportPage: function() {
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
        this.currentReportData = [];

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
                } else if (teacherClassIds.length > 10) {
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

        // Firestore requires the field used in inequality filters to be the first orderBy field.
        query = query.orderBy('date'); // ORDER BY DATE FIRST

        // Then, you can order by other fields.
        // If a class is selected, it's good to sort by studentId within that class for that date.
        // If no class is selected (e.g., admin all classes), you might want classId then studentId.
        if (selectedClassId) {
            query = query.orderBy('studentId');
        } else {
            // If querying across multiple classes, order by classId then studentId
            // This helps in grouping/processing if needed, though our pivot mainly uses studentId
            query = query.orderBy('classId').orderBy('studentId');
        }

        try {
            const attendanceSnapshot = await query.get();
            if (attendanceSnapshot.empty) {
                reportResultArea.innerHTML = '<p>ไม่พบข้อมูลการเข้าเรียนตามเงื่อนไขที่เลือก</p>';
                this.currentReportData = []; // Ensure it's empty for export
                return;
            }

            const { studentCache, classCache, teacherNameCache } = await this.fetchRelatedDataForReport(attendanceSnapshot);
            // Prepare raw data first (for CSV and as base for pivoting)
            this.currentReportData = this.prepareDataForTableAndExport(attendanceSnapshot, studentCache, classCache, teacherNameCache);

            // Then, transform data for the pivot table display
            const { pivotedData, uniqueDates } = this.transformDataForPivotView(this.currentReportData);
            this.renderReportTable(reportResultArea, pivotedData, uniqueDates, startDate, endDate, selectedClassId, classCache);

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
                date: record.date, // Keep original date
                className: classData.className || 'N/A',
                classId: record.classId,
                studentId: record.studentId,
                studentFirstName: studentData.firstName || 'N/A',
                studentLastName: studentData.lastName || '',
                status: statusTranslations[record.status] || record.status,
                markedBy: teacherData.displayName || (record.markedBy ? record.markedBy.substring(0,8) : 'N/A')
            });
        });
        // Sort by student name then date for easier processing in pivot
        reportData.sort((a, b) => {
            const nameA = `${a.studentFirstName} ${a.studentLastName}`.toLowerCase();
            const nameB = `${b.studentFirstName} ${b.studentLastName}`.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            if (a.date < b.date) return -1;
            if (a.date > b.date) return 1;
            return 0;
        });
        return reportData;
    },

    transformDataForPivotView: function(reportData) {
        const pivotedData = {}; // studentId -> { studentInfo, attendance: { date: status } }
        const uniqueDatesSet = new Set();

        reportData.forEach(record => {
            uniqueDatesSet.add(record.date);

            if (!pivotedData[record.studentId]) {
                pivotedData[record.studentId] = {
                    studentId: record.studentId,
                    studentFirstName: record.studentFirstName,
                    studentLastName: record.studentLastName,
                    attendance: {}
                };
            }
            pivotedData[record.studentId].attendance[record.date] = record.status;
        });

        const uniqueDates = Array.from(uniqueDatesSet).sort(); // Sort dates chronologically

        // Convert pivotedData object to array AND SORT BY studentId
        const sortedPivotedData = Object.values(pivotedData).sort((a, b) => {
            // Compare studentId directly (assuming they are strings that sort naturally, e.g., "S001", "S002", "S010")
            // If studentIds are purely numeric and stored as numbers, this sort is fine.
            // If they are strings but need numerical sorting (e.g., "1", "2", "10"),
            // you might need a more complex sort or ensure they are padded with leading zeros.
            if (a.studentId < b.studentId) return -1;
            if (a.studentId > b.studentId) return 1;
            return 0;
        });

        return { pivotedData: sortedPivotedData, uniqueDates };
    },

    renderReportTable: function(reportResultArea, pivotedData, uniqueDates, startDate, endDate, selectedClassId, allClassCache) {
        let html = `<h4>รายงานระหว่างวันที่ ${startDate} ถึง ${endDate}</h4>`;
        if (selectedClassId && allClassCache[selectedClassId]) {
            html += `<p><strong>ห้องเรียน:</strong> ${allClassCache[selectedClassId].className}</p>`;
        } else if (!selectedClassId && this.userRole === 'teacher' && this.teacherClassesDetails.length > 0 && this.teacherClassesDetails.length <= 10) {
            html += `<p><strong>ห้องเรียน:</strong> ทุกห้องของคุณ</p>`;
        } else if (!selectedClassId && this.userRole === 'admin') {
            html += `<p><strong>ห้องเรียน:</strong> ทุกห้องเรียน</p>`;
        }

        html += '<div class="table-responsive-wrapper spreadsheet-style">';
        html += '<table><thead><tr><th>รหัส</th><th>ชื่อจริง</th><th>นามสกุล</th>';

        uniqueDates.forEach(date => {
            html += `<th>${date}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Helper function to get status class
        const getStatusClass = (statusText) => {
            if (!statusText) return 'status-empty'; // For empty cells
            switch (statusText) {
                case 'มา':
                    return 'status-present';
                case 'ไม่มา':
                    return 'status-absent';
                case 'สาย':
                    return 'status-late';
                case 'ลา':
                    return 'status-leave';
                default:
                    return ''; // No specific class for unknown status
            }
        };

        if (!pivotedData || pivotedData.length === 0) {
            const colspan = 3 + uniqueDates.length;
            html += `<tr><td colspan="${colspan}" style="text-align:center;">ไม่พบข้อมูล</td></tr>`;
        } else {
            pivotedData.forEach(studentData => {
                html += `<tr>
                            <td>${studentData.studentId}</td>
                            <td>${studentData.studentFirstName}</td>
                            <td>${studentData.studentLastName}</td>`;
                uniqueDates.forEach(date => {
                    const status = studentData.attendance[date] || '';
                    const statusClass = getStatusClass(status);
                    // Add class "status-cell" for base styling and specific status class
                    html += `<td class="status-cell ${statusClass}">${status}</td>`; // MODIFIED
                });
                html += `</tr>`;
            });
        }

        html += '</tbody></table></div>';
        reportResultArea.innerHTML = html;
    },

    // --- CSV Export Functionality (for Teacher) ---
    // This function remains unchanged as it uses this.currentReportData (the raw, row-based data)
    exportDataToCSV: function() {
        if (this.currentReportData.length === 0) {
            alert("ไม่มีข้อมูลให้ Export");
            return;
        }

        const headers = ["วันที่", "รหัสห้องเรียน", "ชื่อห้องเรียน", "รหัสนักเรียน", "ชื่อจริง", "นามสกุล", "สถานะ", "ผู้บันทึก"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

        this.currentReportData.forEach(item => {
            const escapeCSV = (field) => {
                if (typeof field === 'string' && field.includes(',')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return String(field); // Ensure it's a string
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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
// js/main.js

// Import สิ่งที่จำเป็นจาก firebase-init.js
// ตรวจสอบให้แน่ใจว่า path './firebase-init.js' ถูกต้อง
import { db, collection, doc, setDoc, getDoc } from './firebase-init.js';

// ใช้ Immediately Invoked Function Expression (IIFE) เพื่อห่อหุ้มโค้ดหลัก
// และทำให้สามารถใช้ async/await ที่ top level ของ IIFE ได้
(async () => {
    // ตรวจสอบว่า db และ functions ถูก import มาอย่างถูกต้อง
    if (!db || !collection || !doc || !setDoc || !getDoc) {
        console.error("Firebase modules (db or Firestore functions) are not imported correctly from firebase-init.js.");
        alert("เกิดข้อผิดพลาดในการเริ่มต้นฐานข้อมูล โปรดรีเฟรชหน้าจอ");
        return; // หยุดการทำงานถ้ามีปัญหา
    }

    // --- DOM Elements ---
    const dateElement = document.getElementById('current-date');
    const classNameDisplay = document.getElementById('class-name-display');
    const studentListBody = document.getElementById('student-list-body');
    const saveButton = document.getElementById('save-button');

    // --- Configuration & State ---
    const today = new Date();
    let currentDateString = ""; // จะถูกตั้งค่าเป็น YYYY-MM-DD
    const currentClassNameConfig = "ม.1/1 - วิชา: คณิตศาสตร์"; // ชื่อห้องที่แสดงผล
    const currentClassNameForFirestore = currentClassNameConfig.replace(/[^a-zA-Z0-9]/g, '_'); // ID สำหรับ Firestore

    // ตั้งค่าวันที่และชื่อห้องที่แสดงผล
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('th-TH', options);
        currentDateString = today.toISOString().slice(0, 10);
    }
    if (classNameDisplay) {
        classNameDisplay.textContent = currentClassNameConfig;
    }

    // ข้อมูลนักเรียนเบื้องต้น (ในอนาคตอาจจะดึงมาจาก Firestore collection 'students')
    let studentsMasterList = [
        { id: "001", name: "เด็กชาย ก. ไก่" },
        { id: "002", name: "เด็กหญิง ข. ไข่" },
        { id: "003", name: "เด็กชาย ค. ควาย" },
        { id: "004", name: "เด็กหญิง ฆ. ระฆัง" },
        { id: "005", name: "เด็กชาย ง. งู" }
    ];

    // State สำหรับข้อมูลการเช็คชื่อของวันนี้
    let currentDayAttendance = studentsMasterList.map(s => ({
        studentId: s.id,
        studentName: s.name,
        status: "", // สถานะเริ่มต้น: ว่าง
        note: ""    // หมายเหตุเริ่มต้น: ว่าง
    }));

    // Reference ไปยัง Firestore collection
    const attendanceCollectionRef = collection(db, "attendanceRecords");

    // --- ฟังก์ชันสำหรับโหลดข้อมูลจาก Firestore ---
    async function loadAttendanceDataFromFirestore() {
        if (!currentDateString) {
            console.warn("currentDateString is not set. Cannot load attendance data.");
            return;
        }
        const docId = `${currentClassNameForFirestore}_${currentDateString}`;
        const docRef = doc(attendanceCollectionRef, docId);

        try {
            console.log(`Attempting to load document: attendanceRecords/${docId}`);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Data loaded from Firestore:", data);
                if (data.students && Array.isArray(data.students)) {
                    const masterStudentMap = new Map(studentsMasterList.map(s => [s.id, s.name]));

                    // อัปเดต currentDayAttendance ด้วยข้อมูลที่โหลดมา
                    currentDayAttendance = data.students.map(loadedStudent => ({
                        studentId: loadedStudent.studentId,
                        studentName: masterStudentMap.get(loadedStudent.studentId) || loadedStudent.studentName || 'Unknown Student',
                        status: loadedStudent.status || "",
                        note: loadedStudent.note || ""
                    }));

                    // (Optional but good practice) จัดการกับนักเรียนใน master list ที่ไม่มีในข้อมูลที่โหลดมา (เช่น นักเรียนใหม่)
                    studentsMasterList.forEach(masterStudent => {
                        if (!currentDayAttendance.find(s => s.studentId === masterStudent.id)) {
                            currentDayAttendance.push({
                                studentId: masterStudent.id,
                                studentName: masterStudent.name,
                                status: "",
                                note: ""
                            });
                        }
                    });
                    // (Optional) ลบนักเรียนที่โหลดมาแต่ไม่มีใน master list ปัจจุบัน (ถ้ามีการแก้ไข master list)
                    currentDayAttendance = currentDayAttendance.filter(attStudent => masterStudentMap.has(attStudent.studentId));
                }
            } else {
                console.log(`Document attendanceRecords/${docId} does not exist. Using initial data.`);
                // ถ้าไม่มีข้อมูล, currentDayAttendance จะใช้ค่าเริ่มต้นที่ map จาก studentsMasterList
            }
        } catch (error) {
            console.error("Error loading attendance data from Firestore:", error);
            alert("เกิดข้อผิดพลาดในการโหลดข้อมูลการเช็คชื่อ: " + error.message);
        }
    }

    // --- ฟังก์ชันสำหรับบันทึกข้อมูลลง Firestore ---
    async function saveAttendanceDataToFirestore() {
        if (!currentDateString) {
            alert("ไม่สามารถระบุวันที่ปัจจุบันได้");
            return;
        }
        const docId = `${currentClassNameForFirestore}_${currentDateString}`;
        const docRef = doc(attendanceCollectionRef, docId);

        // รวบรวมข้อมูลล่าสุดเพื่อบันทึก
        // สถานะจะถูกอัปเดตใน currentDayAttendance โดยตรงจาก event listener ของ radio button
        // หมายเหตุจะถูกดึงจาก input fields ณ เวลากดบันทึก
        const dataToSave = {
            className: currentClassNameConfig, // เก็บชื่อห้องแบบที่แสดงผล
            date: currentDateString,
            students: currentDayAttendance.map(student => {
                const noteInputElement = studentListBody.querySelector(`input[type="text"][data-student-id="${student.studentId}"]`);
                const noteValue = noteInputElement ? noteInputElement.value.trim() : (student.note || ""); // ใช้ค่าจาก input หรือค่าเดิม
                return {
                    studentId: student.studentId,
                    studentName: student.studentName,
                    status: student.status || "", // ตรวจสอบให้มีค่าเสมอ
                    note: noteValue
                };
            })
        };

        try {
            console.log(`Attempting to save document: attendanceRecords/${docId} with data:`, dataToSave);
            await setDoc(docRef, dataToSave); // setDoc จะสร้างหรือเขียนทับ
            console.log('ข้อมูลการเช็คชื่อถูกบันทึกลง Firestore เรียบร้อยแล้ว');
            alert('ข้อมูลการเช็คชื่อถูกบันทึกเรียบร้อยแล้ว!');
        } catch (error) {
            console.error("Error saving attendance data to Firestore:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message + "\nโปรดตรวจสอบ Security Rules ใน Firebase Console และการเชื่อมต่ออินเทอร์เน็ต");
        }
    }

    // --- ฟังก์ชันสำหรับสร้างตารางนักเรียน ---
    function renderStudentList() {
        if (!studentListBody) {
            console.error("Element with id 'student-list-body' not found.");
            return;
        }
        studentListBody.innerHTML = ''; // เคลียร์ตารางเก่า

        // เรียงลำดับนักเรียน (ถ้าต้องการ)
        currentDayAttendance.sort((a, b) => a.studentId.localeCompare(b.studentId));

        currentDayAttendance.forEach((student, index) => {
            const row = document.createElement('tr');

            // ลำดับ
            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;
            row.appendChild(indexCell);

            // ชื่อ-นามสกุล
            const nameCell = document.createElement('td');
            nameCell.textContent = student.studentName;
            row.appendChild(nameCell);

            // สถานะ (Radio Buttons)
            const statusCell = document.createElement('td');
            const statuses = ["มาเรียน", "ขาด", "ลา", "มาสาย"];
            statuses.forEach(statusValue => {
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = `status-${student.studentId}`; // Unique name per student
                radioInput.value = statusValue;
                radioInput.id = `status-${student.studentId}-${statusValue.replace(/\s+/g, '-')}`; // Unique ID
                if (student.status === statusValue) {
                    radioInput.checked = true;
                }

                radioInput.addEventListener('change', function() {
                    // อัปเดตสถานะใน currentDayAttendance array โดยตรง
                    const studentToUpdate = currentDayAttendance.find(s => s.studentId === student.studentId);
                    if (studentToUpdate) {
                        studentToUpdate.status = this.value;
                        console.log(`Student ${studentToUpdate.studentName} status updated to: ${studentToUpdate.status}`);
                    }
                });

                const label = document.createElement('label');
                label.htmlFor = radioInput.id;
                label.textContent = statusValue;

                statusCell.appendChild(radioInput);
                statusCell.appendChild(label);
            });
            row.appendChild(statusCell);

            // หมายเหตุ
            const noteCell = document.createElement('td');
            const noteInput = document.createElement('input');
            noteInput.type = 'text';
            noteInput.placeholder = 'หมายเหตุ...';
            noteInput.dataset.studentId = student.studentId; // ใช้ dataset เพื่ออ้างอิง
            noteInput.value = student.note || '';
            // ไม่ต้องมี event listener 'input' ที่นี่แล้ว, เราดึงค่าตอน save
            noteCell.appendChild(noteInput);
            row.appendChild(noteCell);

            studentListBody.appendChild(row);
        });
    }

    // --- Event Listener สำหรับปุ่มบันทึก ---
    if (saveButton) {
        saveButton.addEventListener('click', saveAttendanceDataToFirestore);
    } else {
        console.error("Save button not found.");
    }

    // --- ลำดับการทำงานเริ่มต้น ---
    // รอให้ DOM โหลดเสร็จสมบูรณ์ก่อน (ถ้า script อยู่ใน <head> หรือต้องการความแน่นอน)
    // ถ้า script อยู่ท้าย <body> แล้ว DOMContentLoaded อาจจะไม่จำเป็นเสมอไป
    // แต่การใช้ IIFE async ก็ช่วยให้โค้ดส่วนบน (config, DOM refs) ทำงานก่อน
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await loadAttendanceDataFromFirestore();
            renderStudentList();
        });
    } else {
        // DOMContentLoaded has already fired
        await loadAttendanceDataFromFirestore();
        renderStudentList();
    }

})(); // สิ้นสุด IIFE
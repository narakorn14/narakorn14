// รอให้ HTML โหลดเสร็จสมบูรณ์ก่อนค่อยเริ่มทำงานกับ JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // --- ส่วนแสดงวันที่ปัจจุบัน ---
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('th-TH', options); // แสดงวันที่เป็นภาษาไทย
    }

    // --- ข้อมูลนักเรียน (Hardcode ชั่วคราว) ---
    const students = [
        { id: "001", name: "เด็กชาย ก. ไก่", status: "" }, // status เริ่มต้นเป็นค่าว่าง
        { id: "002", name: "เด็กหญิง ข. ไข่", status: "" },
        { id: "003", name: "เด็กชาย ค. ควาย", status: "" },
        { id: "004", name: "เด็กหญิง ฆ. ระฆัง", status: "" },
        { id: "005", name: "เด็กชาย ง. งู", status: "" }
    ];

    const studentListBody = document.getElementById('student-list-body');
    const saveButton = document.getElementById('save-button');

    // --- ฟังก์ชันสำหรับสร้างตารางนักเรียน ---
    function renderStudentList() {
        if (!studentListBody) return; // ถ้าไม่เจอ element tbody ก็ไม่ต้องทำอะไร

        studentListBody.innerHTML = ''; // เคลียร์ข้อมูลเก่าในตารางก่อน

        students.forEach((student, index) => {
            const row = document.createElement('tr'); // สร้างแถว <tr>

            // คอลัมน์ลำดับ
            const indexCell = document.createElement('td');
            indexCell.textContent = index + 1;
            row.appendChild(indexCell);

            // คอลัมน์ชื่อ-นามสกุล
            const nameCell = document.createElement('td');
            nameCell.textContent = student.name;
            row.appendChild(nameCell);

            // คอลัมน์สถานะ (Radio Buttons)
            const statusCell = document.createElement('td');
            const statuses = ["มาเรียน", "ขาด", "ลา", "มาสาย"]; // ตัวเลือกสถานะ

            statuses.forEach(statusValue => {
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = `status-${student.id}`; // name ต้องไม่ซ้ำกันสำหรับแต่ละกลุ่ม radio ของนักเรียน
                radioInput.value = statusValue;
                radioInput.id = `status-${student.id}-${statusValue}`; // id ที่ไม่ซ้ำกันสำหรับแต่ละ radio
                if (student.status === statusValue) {
                    radioInput.checked = true; // ถ้าสถานะตรงกับที่เก็บไว้ ให้ check radio นั้น
                }

                // Event listener เมื่อมีการเปลี่ยนสถานะ
                radioInput.addEventListener('change', function() {
                    student.status = this.value; // อัปเดตสถานะใน array students
                    console.log(`Student ${student.name} status changed to: ${student.status}`);
                });

                const label = document.createElement('label');
                label.htmlFor = radioInput.id;
                label.textContent = statusValue;

                statusCell.appendChild(radioInput);
                statusCell.appendChild(label);
            });
            row.appendChild(statusCell);

            // คอลัมน์หมายเหตุ (เราจะเพิ่ม input text field ที่นี่ในภายหลัง)
            const noteCell = document.createElement('td');
            const noteInput = document.createElement('input');
            noteInput.type = 'text';
            noteInput.placeholder = 'หมายเหตุ...';
            noteInput.dataset.studentId = student.id; // เก็บ id นักเรียนไว้กับ input field
            noteInput.addEventListener('input', function() {
                // (ทางเลือก) อาจจะบันทึกหมายเหตุทันทีที่พิมพ์ หรือรอตอนกด Save
                // student.note = this.value;
                // console.log(`Note for ${student.name}: ${student.note}`);
            });
            noteCell.appendChild(noteInput);
            row.appendChild(noteCell);


            studentListBody.appendChild(row); // เพิ่มแถวเข้าไปใน tbody
        });
    }

    // --- Event Listener สำหรับปุ่มบันทึก ---
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            console.log("--- ข้อมูลการเช็คชื่อที่จะบันทึก ---");
            const attendanceData = students.map(student => {
                // ดึงค่าหมายเหตุจาก input field
                const noteInputElement = studentListBody.querySelector(`input[type="text"][data-student-id="${student.id}"]`);
                const note = noteInputElement ? noteInputElement.value : '';
                return {
                    id: student.id,
                    name: student.name,
                    status: student.status,
                    note: note
                };
            });
            console.log(attendanceData);
            alert('ข้อมูลการเช็คชื่อถูกบันทึก (ดูใน Console)!');
            // ในอนาคต: ส่งข้อมูลนี้ไปที่ Backend หรือ localStorage
        });
    }

    // --- เรียกใช้ฟังก์ชันเพื่อแสดงผลนักเรียนเมื่อหน้าเว็บโหลด ---
    renderStudentList();

}); // สิ้นสุด DOMContentLoaded
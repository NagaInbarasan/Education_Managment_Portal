# 🚀 PHAZON — Academic Workspace Platform

Welcome to the **PHAZON** Academic Portal web application source code package.

---

## 🛠️ How to Open & Run in Visual Studio Code (VS Code)

### Prerequisites
Make sure you have **Node.js** (v18 or higher) installed on your system.
You can download it from [https://nodejs.org](https://nodejs.org).

---

### Step-by-Step Instructions:

1. **Extract the ZIP file**:
   Extract `PHAZON_Project_Source.zip` to your preferred directory.

2. **Open in VS Code**:
   - Open VS Code.
   - Click `File -> Open Folder...` and select the extracted `PHAZON` directory.

3. **Open Integrated Terminal**:
   - In VS Code, open the terminal by pressing `Ctrl + ~` (or `Terminal -> New Terminal`).

4. **Install Project Dependencies**:
   Run the following command in the VS Code terminal:
   ```bash
   npm install
   ```

5. **Start the Local Development Server**:
   Run:
   ```bash
   npm run dev
   ```

6. **Open in Browser**:
   Click or open `http://localhost:5173/` in your browser to view the application live!

---

## 🌟 Key Features Included

- **👩‍🎓 Student Dashboard**:
  - **7-Tab Profile System**: Personal, Academic, Attendance & Marks, Fee Details (₹), Campus Details, Documents, and Quick Action Bar.
  - **Animated Statistics & Advice**: SVG running stroke CGPA line graph, rotating 3D website usage pie chart, daily attendance log view, and Class Advisor advice box (**Mr. P. Saravanan & Mr. L. Kavibharath**).
  - **8 Periods Modifiable Timetable**: Period schedule editing and custom timetable image/PDF uploader with live preview.
  - **Subject-Wise Materials Repository**: Interactive cards for Maths, AI, Full-Stack, and SE with downloadable PDF notes and recorded video tutorials.
  - **Categorized Fee Payment Portal (₹)**: Tuition Fee (₹65,000), Skill Fee (₹15,000), Hostel Fee (₹25,000); payment options for GPay, PhonePe, Paytm (UPI QR & VPA), Net Banking (HDFC, SBI, ICICI, Axis), and Credit/Debit Cards with instant receipt downloads.
  - **Exam Results Lookup**: Marksheets lookup by Reg No (`STD-2026-001`) and Mobile No (`9876543210`).

- **👨‍🏫 Teacher Dashboard**:
  - Daily Attendance Register marking console (Present/Absent toggle for all 64 students).
  - Regular Study Monitoring & CGPA tracking (10.0 scale, study hours, assignment submissions).
  - Student Fees Details in ₹ & payment reminder notifications.
  - Student Clubs & Extracurricular activities tracking.
  - 7-Tab Student Profile Editor.

- **🏛️ HOD Departmental Console**:
  - Department Class Performance metrics (Avg CGPA `8.9/10.0`, `1,420 Study Hrs`, `92.4%` Attendance Rate).
  - Top 10 Best Performance Leaderboard & Podium (#1 Brody Ballson 9.5, #2 Vikashini 9.2, #3 Jack Nicklson 8.9).
  - Below Average & At-Risk Warning Console (Remedial notices for students needing work).
  - Exam Pass (60 students / 93.75%) vs Fail (04 students / 6.25%) breakdown.
  - Class Average Fees Paid List & Department Financial Overview.

- **👑 Admin Dashboard**:
  - Master controls for student profiles, faculty roster, result publishing, fee structures, and class schedules.

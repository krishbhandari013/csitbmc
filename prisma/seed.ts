import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// This system serves Butwal Multiple Campus only.
const CAMPUSES = [
  { code: "BMC", name: "Butwal Multiple Campus", address: "Golpark, Butwal" },
];

const SUBJECTS: Record<number, [string, string][]> = {
  1: [["CSC110", "Intro to Information Technology"], ["CSC111", "Digital Logic"], ["CSC112", "Programming in C"]],
  2: [["CSC160", "Discrete Structures"], ["CSC161", "Object Oriented Programming"], ["CSC162", "Microprocessor"]],
  3: [["CSC220", "Data Structures & Algorithms"], ["CSC221", "Database Management Systems"], ["CSC222", "Operating Systems"]],
  4: [["CSC260", "Computer Networks"], ["CSC261", "Artificial Intelligence"], ["CSC262", "Theory of Computation"]],
  5: [["CSC350", "Web Technology"], ["CSC351", "Design & Analysis of Algorithms"], ["CSC352", "System Analysis & Design"]],
  6: [["CSC360", "Software Engineering"], ["CSC361", "Compiler Design"], ["CSC362", "E-Governance"]],
  7: [["CSC410", "Advanced Java"], ["CSC411", "Data Warehousing"], ["CSC412", "Project I"]],
  8: [["CSC460", "Advanced Database"], ["CSC461", "Internship"], ["CSC462", "Project II"]],
};

const TOPICS = ["Unit 1: Foundations", "Unit 2: Core Concepts", "Unit 3: Applied Lab", "Unit 4: Case Study & Review"];

const POSTS = [
  ["How to prepare for DSA midterms?", "Seniors, what helped you most for Data Structures & Algorithms? Any notes or practice sets you recommend for our campus?"],
  ["DBMS lab viva tips", "My DBMS viva is next week. Which topics do teachers focus on — normalization, SQL joins, or transactions?"],
  ["Web Tech project ideas", "Looking for a semester project idea in Web Technology that can be finished in 3 weeks. Any suggestions?"],
  ["Attendance confusion", "Does anyone know how attendance % is calculated when classes are missed due to public holidays?"],
  ["AI subject — math heavy?", "For those who took Artificial Intelligence: how much math/statistics should I revise before classes start?"],
];

async function main() {
  console.log("Seeding...");
  await prisma.report.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.submissionStatus.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.courseTopic.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  const campuses = [];
  for (const c of CAMPUSES) campuses.push(await prisma.campus.create({ data: c }));

  // Admin (secure: override via env in production; seed default is DEV ONLY)
  const adminUser = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  await prisma.user.create({
    data: {
      role: "ADMIN", campusId: campuses[0].id, username: adminUser, name: "Campus Administrator",
      passwordHash: await bcrypt.hash(adminPass, 12),
    },
  });

  for (const campus of campuses) {
    // Teachers
    const teacherPw = await bcrypt.hash("Teacher@123", 12);
    const teachers = [];
    for (let i = 1; i <= 3; i++) {
      teachers.push(await prisma.user.create({
        data: { role: "TEACHER", campusId: campus.id, username: `teacher${i}.${campus.code.toLowerCase()}`, name: `Teacher ${i} ${campus.code}`, passwordHash: teacherPw },
      }));
    }
    // Subjects for all semesters
    const subjects = [];
    for (let sem = 1; sem <= 8; sem++) {
      for (const [code, name] of SUBJECTS[sem]) {
        const s = await prisma.subject.create({ data: { campusId: campus.id, semester: sem, code: `${code}`, name, description: `${name} — Semester ${sem}, ${campus.name}.` } });
        subjects.push(s);
        for (let t = 0; t < TOPICS.length; t++)
          await prisma.courseTopic.create({ data: { subjectId: s.id, title: TOPICS[t], order: t, isComplete: sem <= 2 && t < 2 } });
      }
    }
    // Assign teachers round-robin
    for (let i = 0; i < subjects.length; i++)
      await prisma.teacherAssignment.create({ data: { teacherId: teachers[i % teachers.length].id, subjectId: subjects[i].id } }).catch(() => {});

    // Students: 6 per semester for sem 1..4 (keep seed small), PIN "1234"
    const pinHash = await bcrypt.hash("1234", 12);
    for (let sem = 1; sem <= 4; sem++) {
      for (let r = 1; r <= 6; r++) {
        const roll = `${campus.code}-2079-${String(sem).padStart(2, "0")}${String(r).padStart(2, "0")}`;
        await prisma.user.create({ data: { role: "STUDENT", campusId: campus.id, rollNumber: roll, semester: sem, name: `Student ${r} Sem ${sem}`, passwordHash: pinHash } });
      }
    }

    // Attendance: last 10 days for sem-3 first subject
    const sem3 = subjects.filter((s) => s.semester === 3);
    const students3 = await prisma.user.findMany({ where: { campusId: campus.id, role: "STUDENT", semester: 3 } });
    if (sem3[0]) {
      for (let d = 9; d >= 0; d--) {
        const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - d);
        for (const st of students3)
          await prisma.attendanceRecord.upsert({
            where: { subjectId_studentId_date: { subjectId: sem3[0].id, studentId: st.id, date } },
            update: {}, create: { subjectId: sem3[0].id, studentId: st.id, date, status: Math.random() < 0.85 ? "P" : "A" },
          });
      }
      // Assignments
      const a1 = await prisma.assignment.create({ data: { subjectId: sem3[0].id, title: "Assignment 1: Sorting algorithms", description: "Implement merge sort and quick sort with complexity analysis.", dueDate: new Date(Date.now() + 7 * 864e5), link: "" } });
      const a2 = await prisma.assignment.create({ data: { subjectId: sem3[0].id, title: "Assignment 2: ER diagrams", description: "Draw ER diagram for a campus library system.", dueDate: new Date(Date.now() - 2 * 864e5), link: "" } });
      for (const st of students3) {
        await prisma.submissionStatus.create({ data: { assignmentId: a1.id, studentId: st.id, isComplete: Math.random() < 0.5 } });
        await prisma.submissionStatus.create({ data: { assignmentId: a2.id, studentId: st.id, isComplete: Math.random() < 0.7 } });
      }
    }

    // Anonymous posts (NO author stored)
    for (let i = 0; i < POSTS.length; i++) {
      const p = await prisma.post.create({ data: { campusId: campus.id, title: POSTS[i][0], body: POSTS[i][1], upvoteCount: 3 + i * 2, commentCount: 2 } });
      await prisma.comment.create({ data: { postId: p.id, body: "Helpful thread — following for notes. Practice previous-year questions first." } });
      await prisma.comment.create({ data: { postId: p.id, body: "Ask your class representative; they usually keep a shared drive of notes." } });
    }
  }
  console.log("Seed done. DEV admin: admin / Admin@12345 (override with SEED_ADMIN_* env).");
}

main().finally(() => prisma.$disconnect());

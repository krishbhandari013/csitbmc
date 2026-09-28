export function canManageSubject(role: string, userId: string, subject: { id: string; campusId: string }, teacherSubjectIds: string[], sessionCampus: string, isAdmin = false) {
  if (role === "ADMIN") return true;
  if (role !== "TEACHER") return false;
  return teacherSubjectIds.includes(subject.id as string);
}
export async function teacherSubjectIds(prisma: any, teacherId: string): Promise<string[]> {
  const rows = await prisma.teacherAssignment.findMany({ where: { teacherId } });
  return rows.map((r: any) => r.subjectId);
}

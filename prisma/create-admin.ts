import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const campusCode = process.env.ADMIN_CAMPUS_CODE;
  if (!username || !password || !campusCode) {
    console.error("Usage: ADMIN_USERNAME=... ADMIN_PASSWORD=...(min 10 chars) ADMIN_CAMPUS_CODE=... npm run create-admin");
    process.exit(1);
  }
  if (password.length < 10) { console.error("Password must be at least 10 characters."); process.exit(1); }
  const campus = await prisma.campus.findUnique({ where: { code: campusCode } });
  if (!campus) { console.error(`Campus code '${campusCode}' not found.`); process.exit(1); }
  const existing = await prisma.user.findFirst({ where: { username } });
  if (existing) { console.error("Username already exists."); process.exit(1); }
  await prisma.user.create({
    data: { role: "ADMIN", campusId: campus.id, username, name: "Administrator", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Admin '${username}' created for campus ${campusCode}.`);
}
main().finally(() => prisma.$disconnect());

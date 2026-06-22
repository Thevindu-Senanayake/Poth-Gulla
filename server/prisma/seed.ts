import 'dotenv/config';
import { PrismaClient, Role } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const passwordHash = await bcrypt.hash('Password123', 10);

    // Admin/Staff are operational roles — no tier (null).
    // Patron roles (Lecturer/Student) start at 500 pts → Tier 3 (Regular).
    const users = [
        { email: 'admin@iit.ac.lk', name: 'System Admin', role: Role.ADMIN, userPoints: 500, tier: null },
        { email: 'staff@iit.ac.lk', name: 'Library Staff', role: Role.LIBRARY_STAFF, userPoints: 500, tier: null },
        { email: 'lecturer@iit.ac.lk', name: 'Dr. Lecturer', role: Role.LECTURER, userPoints: 500, tier: 3 },
        { email: 'student@iit.ac.lk', name: 'Test Student', role: Role.STUDENT, userPoints: 500, tier: 3 },
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { tier: u.tier, userPoints: u.userPoints },
            create: { ...u, passwordHash },
        });
    }

    console.log('Seeded 4 demo accounts. Password for all: Password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

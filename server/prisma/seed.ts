import 'dotenv/config';
import { PrismaClient, Role } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const passwordHash = await bcrypt.hash('Password123', 10);

    const users = [
        { email: 'admin@iit.ac.lk', name: 'System Admin', role: Role.ADMIN, tier: 1 },
        { email: 'staff@iit.ac.lk', name: 'Library Staff', role: Role.LIBRARY_STAFF, tier: 1 },
        { email: 'lecturer@iit.ac.lk', name: 'Dr. Lecturer', role: Role.LECTURER, tier: 3 },
        { email: 'student@iit.ac.lk', name: 'Test Student', role: Role.STUDENT, tier: 3 },
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { tier: u.tier },
            create: { ...u, userPoints: 500, passwordHash },
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

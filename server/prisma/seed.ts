import 'dotenv/config';
import { CategoryType, ItemStatus, PrismaClient, Role } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---- Users ----

async function seedUsers(passwordHash: string) {
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
    console.log('  ✓ Users');
}

// ---- Categories ----

async function seedCategories() {
    const categories = [
        { name: 'Computer Science', type: CategoryType.BOOK },
        { name: 'Fiction', type: CategoryType.BOOK },
        { name: 'Science & Engineering', type: CategoryType.BOOK },
        { name: 'Laptops', type: CategoryType.DEVICE },
        { name: 'Tablets', type: CategoryType.DEVICE },
    ];

    for (const c of categories) {
        await prisma.category.upsert({
            where: { name_type: { name: c.name, type: c.type } },
            update: {},
            create: c,
        });
    }
    console.log('  ✓ Categories');
}

// ---- Books ----

async function seedBooks() {
    const csCategory = await prisma.category.findUniqueOrThrow({
        where: { name_type: { name: 'Computer Science', type: CategoryType.BOOK } },
    });
    const fictionCategory = await prisma.category.findUniqueOrThrow({
        where: { name_type: { name: 'Fiction', type: CategoryType.BOOK } },
    });
    const scienceCategory = await prisma.category.findUniqueOrThrow({
        where: { name_type: { name: 'Science & Engineering', type: CategoryType.BOOK } },
    });

    const titles = [
        {
            isbn: '978-0-13-235088-4',
            title: 'Clean Code',
            author: 'Robert C. Martin',
            description: 'A handbook of agile software craftsmanship.',
            tags: ['programming', 'software engineering', 'best practices'],
            categoryId: csCategory.id,
            copies: ['BK-CC-001', 'BK-CC-002', 'BK-CC-003'],
        },
        {
            isbn: '978-0-13-595705-9',
            title: 'The Pragmatic Programmer',
            author: 'David Thomas, Andrew Hunt',
            description: 'From journeyman to master.',
            tags: ['programming', 'career', 'software engineering'],
            categoryId: csCategory.id,
            copies: ['BK-PP-001', 'BK-PP-002'],
        },
        {
            isbn: '978-0-20-163361-5',
            title: 'Design Patterns',
            author: 'Gang of Four',
            description: 'Elements of reusable object-oriented software.',
            tags: ['design patterns', 'object-oriented', 'architecture'],
            categoryId: csCategory.id,
            copies: ['BK-DP-001', 'BK-DP-002'],
        },
        {
            isbn: '978-0-14-102674-8',
            title: 'Dune',
            author: 'Frank Herbert',
            description: 'The epic sci-fi saga of planet Arrakis.',
            tags: ['science fiction', 'epic', 'classic'],
            categoryId: fictionCategory.id,
            copies: ['BK-DN-001', 'BK-DN-002', 'BK-DN-003'],
        },
        {
            isbn: '978-0-26-110952-8',
            title: 'The Lord of the Rings',
            author: 'J.R.R. Tolkien',
            description: 'The classic high fantasy trilogy.',
            tags: ['fantasy', 'classic', 'adventure'],
            categoryId: fictionCategory.id,
            copies: ['BK-LR-001', 'BK-LR-002'],
        },
        {
            isbn: '978-0-13-468599-1',
            title: 'Introduction to Algorithms',
            author: 'Cormen, Leiserson, Rivest, Stein',
            description: 'The definitive algorithms textbook (CLRS).',
            tags: ['algorithms', 'data structures', 'computer science'],
            categoryId: scienceCategory.id,
            copies: ['BK-IA-001', 'BK-IA-002'],
        },
    ];

    for (const { copies, ...titleData } of titles) {
        const title = await prisma.bookTitle.upsert({
            where: { isbn: titleData.isbn },
            update: {},
            create: { ...titleData, language: 'English' },
        });

        for (const assetTag of copies) {
            await prisma.bookCopy.upsert({
                where: { assetTag },
                update: {},
                create: { bookTitleId: title.id, assetTag, status: ItemStatus.AVAILABLE },
            });
        }
    }
    console.log('  ✓ Book titles and copies');
}

// ---- Devices ----

async function seedDevices() {
    const laptopCategory = await prisma.category.findUniqueOrThrow({
        where: { name_type: { name: 'Laptops', type: CategoryType.DEVICE } },
    });
    const tabletCategory = await prisma.category.findUniqueOrThrow({
        where: { name_type: { name: 'Tablets', type: CategoryType.DEVICE } },
    });

    // deviceTier matches the patron tier system: 4-5 require staff approval for checkout.
    const devices = [
        { assetTag: 'DEV-MBP-001', name: 'MacBook Pro 16"', deviceTier: 5, categoryId: laptopCategory.id },
        { assetTag: 'DEV-MBP-002', name: 'MacBook Pro 16"', deviceTier: 5, categoryId: laptopCategory.id },
        { assetTag: 'DEV-XPS-001', name: 'Dell XPS 15', deviceTier: 4, categoryId: laptopCategory.id },
        { assetTag: 'DEV-XPS-002', name: 'Dell XPS 15', deviceTier: 4, categoryId: laptopCategory.id },
        { assetTag: 'DEV-LTP-001', name: 'Lenovo ThinkPad E15', deviceTier: 3, categoryId: laptopCategory.id },
        { assetTag: 'DEV-LTP-002', name: 'Lenovo ThinkPad E15', deviceTier: 3, categoryId: laptopCategory.id },
        { assetTag: 'DEV-IPD-001', name: 'iPad Pro 12.9"', deviceTier: 3, categoryId: tabletCategory.id },
        { assetTag: 'DEV-TAB-001', name: 'Samsung Galaxy Tab S8', deviceTier: 2, categoryId: tabletCategory.id },
        { assetTag: 'DEV-TAB-002', name: 'Samsung Galaxy Tab S8', deviceTier: 2, categoryId: tabletCategory.id },
    ];

    for (const d of devices) {
        await prisma.device.upsert({
            where: { assetTag: d.assetTag },
            update: {},
            create: { ...d, status: ItemStatus.AVAILABLE },
        });
    }
    console.log('  ✓ Devices');
}

// ---- Study rooms ----

async function seedRooms() {
    const rooms = [
        {
            name: 'Study Room A',
            capacity: 4,
            features: ['whiteboard', 'projector', 'AC'],
            roomQr: 'ROOM-QR-A',
        },
        {
            name: 'Study Room B',
            capacity: 8,
            features: ['whiteboard', 'projector', 'TV screen', 'AC'],
            roomQr: 'ROOM-QR-B',
        },
        {
            name: 'Study Room C',
            capacity: 2,
            features: ['whiteboard'],
            roomQr: 'ROOM-QR-C',
        },
        {
            name: 'Conference Room',
            capacity: 12,
            features: ['whiteboard', 'projector', 'video conferencing', 'AC'],
            roomQr: 'ROOM-QR-CONF',
        },
    ];

    for (const r of rooms) {
        await prisma.studyRoom.upsert({
            where: { name: r.name },
            update: {},
            create: { ...r, status: ItemStatus.AVAILABLE },
        });
    }
    console.log('  ✓ Study rooms');
}

// ---- Main ----

async function main() {
    console.log('Seeding database...');
    const passwordHash = await bcrypt.hash('Password123', 10);

    await seedUsers(passwordHash);
    await seedCategories();
    await seedBooks();
    await seedDevices();
    await seedRooms();

    console.log('\nDone. Demo accounts password: Password123');
    console.log('  admin@iit.ac.lk  |  staff@iit.ac.lk  |  lecturer@iit.ac.lk  |  student@iit.ac.lk');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

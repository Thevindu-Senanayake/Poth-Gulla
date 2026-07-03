import 'dotenv/config';
import {
  CategoryType,
  ItemStatus,
  PrismaClient,
  Role,
} from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---- Users ----

async function seedUsers(passwordHash: string) {
  // Admin/Staff are operational roles - no tier (null).
  // Patron demo accounts span every tier so waitlist priority, tier limits
  // and the review flow are all demonstrable out of the box.
  const users = [
    {
      email: 'admin@iit.ac.lk',
      name: 'System Admin',
      role: Role.ADMIN,
      userPoints: 500,
      tier: null,
    },
    {
      email: 'staff@iit.ac.lk',
      name: 'Library Staff',
      role: Role.LIBRARY_STAFF,
      userPoints: 500,
      tier: null,
    },
    {
      email: 'lecturer@iit.ac.lk',
      name: 'Dr. Lecturer',
      role: Role.LECTURER,
      userPoints: 500,
      tier: 3,
    },
    {
      email: 'student@iit.ac.lk',
      name: 'Test Student',
      role: Role.STUDENT,
      userPoints: 500,
      tier: 3,
    },
    {
      email: 'tier1.student@iit.ac.lk',
      name: 'Kasun Silva',
      role: Role.STUDENT,
      userPoints: 100,
      tier: 1,
    },
    {
      email: 'tier2.student@iit.ac.lk',
      name: 'Nadeesha Fernando',
      role: Role.STUDENT,
      userPoints: 300,
      tier: 2,
    },
    {
      email: 'tier4.student@iit.ac.lk',
      name: 'Ruwan Jayasuriya',
      role: Role.STUDENT,
      userPoints: 1200,
      tier: 4,
    },
    {
      email: 'tier5.student@iit.ac.lk',
      name: 'Ishara Weerasinghe',
      role: Role.STUDENT,
      userPoints: 2400,
      tier: 5,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { tier: u.tier, userPoints: u.userPoints },
      create: { ...u, passwordHash },
    });
  }
  console.log(`  ✓ Users (${users.length})`);
}

// ---- Categories ----

const BOOK_CATEGORIES = [
  'Computer Science',
  'Fiction',
  'Science & Engineering',
  'Mathematics',
  'Business & Management',
];
const DEVICE_CATEGORIES = ['Laptops', 'Tablets', 'Cameras & AV', 'Accessories'];

async function seedCategories() {
  const categories = [
    ...BOOK_CATEGORIES.map((name) => ({ name, type: CategoryType.BOOK })),
    ...DEVICE_CATEGORIES.map((name) => ({ name, type: CategoryType.DEVICE })),
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ Categories (${categories.length})`);
}

// ---- Books ----

type SeedBook = {
  isbn: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  category: string;
  copies: string[];
};

const BOOKS: SeedBook[] = [
  // -- Computer Science --
  {
    isbn: '978-0-13-235088-4',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A handbook of agile software craftsmanship.',
    tags: ['programming', 'software engineering', 'best practices'],
    category: 'Computer Science',
    copies: ['BK-CC-001', 'BK-CC-002', 'BK-CC-003'],
  },
  {
    isbn: '978-0-13-595705-9',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas, Andrew Hunt',
    description: 'From journeyman to master.',
    tags: ['programming', 'career', 'software engineering'],
    category: 'Computer Science',
    copies: ['BK-PP-001', 'BK-PP-002'],
  },
  {
    isbn: '978-0-20-163361-5',
    title: 'Design Patterns',
    author: 'Gang of Four',
    description: 'Elements of reusable object-oriented software.',
    tags: ['design patterns', 'object-oriented', 'architecture'],
    category: 'Computer Science',
    copies: ['BK-DP-001', 'BK-DP-002'],
  },
  {
    isbn: '978-0-13-475759-9',
    title: 'Refactoring',
    author: 'Martin Fowler',
    description: 'Improving the design of existing code, second edition.',
    tags: ['refactoring', 'software engineering', 'code quality'],
    category: 'Computer Science',
    copies: ['BK-RF-001', 'BK-RF-002'],
  },
  {
    isbn: '978-0-7356-1967-0',
    title: 'Code Complete',
    author: 'Steve McConnell',
    description: 'A practical handbook of software construction.',
    tags: ['programming', 'construction', 'best practices'],
    category: 'Computer Science',
    copies: ['BK-CO-001', 'BK-CO-002'],
  },
  {
    isbn: '978-0-201-83595-3',
    title: 'The Mythical Man-Month',
    author: 'Frederick P. Brooks Jr.',
    description: 'Essays on software engineering and project management.',
    tags: ['project management', 'software engineering', 'classic'],
    category: 'Computer Science',
    copies: ['BK-MM-001'],
  },
  {
    isbn: '978-0-13-117705-5',
    title: 'Working Effectively with Legacy Code',
    author: 'Michael Feathers',
    description: 'Strategies for taming untested, tangled codebases.',
    tags: ['legacy code', 'testing', 'refactoring'],
    category: 'Computer Science',
    copies: ['BK-WL-001'],
  },
  {
    isbn: '978-0-9847828-5-7',
    title: 'Cracking the Coding Interview',
    author: 'Gayle Laakmann McDowell',
    description: '189 programming questions and solutions.',
    tags: ['interviews', 'algorithms', 'career'],
    category: 'Computer Science',
    copies: ['BK-CI-001', 'BK-CI-002', 'BK-CI-003'],
  },
  {
    isbn: '978-1-4493-7332-0',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    description: 'The big ideas behind reliable, scalable systems.',
    tags: ['distributed systems', 'databases', 'architecture'],
    category: 'Computer Science',
    copies: ['BK-DD-001', 'BK-DD-002'],
  },
  {
    isbn: '978-0-13-449416-6',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    description: "A craftsman's guide to software structure and design.",
    tags: ['architecture', 'design', 'software engineering'],
    category: 'Computer Science',
    copies: ['BK-CA-001', 'BK-CA-002'],
  },
  {
    isbn: '978-1-118-06333-0',
    title: 'Operating System Concepts',
    author: 'Silberschatz, Galvin, Gagne',
    description: 'The classic dinosaur book on operating systems.',
    tags: ['operating systems', 'textbook', 'computer science'],
    category: 'Computer Science',
    copies: ['BK-OS-001', 'BK-OS-002'],
  },
  {
    isbn: '978-0-13-212695-3',
    title: 'Computer Networks',
    author: 'Andrew S. Tanenbaum',
    description: 'From the physical layer to application protocols.',
    tags: ['networking', 'textbook', 'computer science'],
    category: 'Computer Science',
    copies: ['BK-CN-001', 'BK-CN-002'],
  },
  {
    isbn: '978-0-13-461099-3',
    title: 'Artificial Intelligence: A Modern Approach',
    author: 'Stuart Russell, Peter Norvig',
    description: 'The standard text in artificial intelligence.',
    tags: ['AI', 'machine learning', 'textbook'],
    category: 'Computer Science',
    copies: ['BK-AI-001', 'BK-AI-002'],
  },
  {
    isbn: '978-0-13-468599-1',
    title: 'Introduction to Algorithms',
    author: 'Cormen, Leiserson, Rivest, Stein',
    description: 'The definitive algorithms textbook (CLRS).',
    tags: ['algorithms', 'data structures', 'computer science'],
    category: 'Computer Science',
    copies: ['BK-IA-001', 'BK-IA-002'],
  },
  // -- Science & Engineering --
  {
    isbn: '978-0-553-38016-3',
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    description: 'From the Big Bang to black holes.',
    tags: ['physics', 'cosmology', 'popular science'],
    category: 'Science & Engineering',
    copies: ['BK-BH-001', 'BK-BH-002'],
  },
  {
    isbn: '978-0-19-878860-7',
    title: 'The Selfish Gene',
    author: 'Richard Dawkins',
    description: 'The gene-centred view of evolution.',
    tags: ['biology', 'evolution', 'popular science'],
    category: 'Science & Engineering',
    copies: ['BK-SG-001'],
  },
  {
    isbn: '978-1-137-03120-4',
    title: 'Engineering Mathematics',
    author: 'K.A. Stroud',
    description: 'The bestselling foundation text for engineering students.',
    tags: ['mathematics', 'engineering', 'textbook'],
    category: 'Science & Engineering',
    copies: ['BK-EM-001', 'BK-EM-002', 'BK-EM-003'],
  },
  {
    isbn: '978-0-306-81283-5',
    title: "Structures: Or Why Things Don't Fall Down",
    author: 'J.E. Gordon',
    description: 'An engaging introduction to structural engineering.',
    tags: ['engineering', 'structures', 'popular science'],
    category: 'Science & Engineering',
    copies: ['BK-ST-001'],
  },
  // -- Mathematics --
  {
    isbn: '978-1-285-74062-1',
    title: 'Calculus: Early Transcendentals',
    author: 'James Stewart',
    description: 'The widely used calculus text.',
    tags: ['calculus', 'mathematics', 'textbook'],
    category: 'Mathematics',
    copies: ['BK-CL-001', 'BK-CL-002', 'BK-CL-003'],
  },
  {
    isbn: '978-3-319-11079-0',
    title: 'Linear Algebra Done Right',
    author: 'Sheldon Axler',
    description: 'Determinant-free linear algebra for undergraduates.',
    tags: ['linear algebra', 'mathematics', 'textbook'],
    category: 'Mathematics',
    copies: ['BK-LA-001', 'BK-LA-002'],
  },
  {
    isbn: '978-0-07-338309-5',
    title: 'Discrete Mathematics and Its Applications',
    author: 'Kenneth H. Rosen',
    description: 'Logic, sets, combinatorics, graphs and more.',
    tags: ['discrete math', 'mathematics', 'textbook'],
    category: 'Mathematics',
    copies: ['BK-DM-001', 'BK-DM-002'],
  },
  // -- Fiction --
  {
    isbn: '978-0-14-102674-8',
    title: 'Dune',
    author: 'Frank Herbert',
    description: 'The epic sci-fi saga of planet Arrakis.',
    tags: ['science fiction', 'epic', 'classic'],
    category: 'Fiction',
    copies: ['BK-DN-001', 'BK-DN-002', 'BK-DN-003'],
  },
  {
    isbn: '978-0-26-110952-8',
    title: 'The Lord of the Rings',
    author: 'J.R.R. Tolkien',
    description: 'The classic high fantasy trilogy.',
    tags: ['fantasy', 'classic', 'adventure'],
    category: 'Fiction',
    copies: ['BK-LR-001', 'BK-LR-002'],
  },
  {
    isbn: '978-0-452-28423-4',
    title: '1984',
    author: 'George Orwell',
    description: 'The dystopian classic of surveillance and control.',
    tags: ['dystopia', 'classic', 'political fiction'],
    category: 'Fiction',
    copies: ['BK-84-001', 'BK-84-002', 'BK-84-003'],
  },
  {
    isbn: '978-0-547-92822-7',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    description: 'There and back again.',
    tags: ['fantasy', 'classic', 'adventure'],
    category: 'Fiction',
    copies: ['BK-HB-001', 'BK-HB-002'],
  },
  {
    isbn: '978-0-553-29335-7',
    title: 'Foundation',
    author: 'Isaac Asimov',
    description: 'Psychohistory and the fall of a galactic empire.',
    tags: ['science fiction', 'classic', 'series'],
    category: 'Fiction',
    copies: ['BK-FD-001', 'BK-FD-002'],
  },
  {
    isbn: '978-0-593-13520-4',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    description: 'A lone astronaut must save Earth from disaster.',
    tags: ['science fiction', 'space', 'bestseller'],
    category: 'Fiction',
    copies: ['BK-HM-001', 'BK-HM-002'],
  },
  // -- Business & Management --
  {
    isbn: '978-0-307-88789-4',
    title: 'The Lean Startup',
    author: 'Eric Ries',
    description: 'Continuous innovation for radically successful businesses.',
    tags: ['startups', 'entrepreneurship', 'management'],
    category: 'Business & Management',
    copies: ['BK-LS-001', 'BK-LS-002'],
  },
  {
    isbn: '978-0-8041-3929-8',
    title: 'Zero to One',
    author: 'Peter Thiel',
    description: 'Notes on startups, or how to build the future.',
    tags: ['startups', 'entrepreneurship', 'strategy'],
    category: 'Business & Management',
    copies: ['BK-ZO-001'],
  },
  {
    isbn: '978-0-374-53355-7',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    description: 'The two systems that drive the way we think.',
    tags: ['psychology', 'decision making', 'behavioural economics'],
    category: 'Business & Management',
    copies: ['BK-TF-001', 'BK-TF-002'],
  },
];

async function seedBooks() {
  const categoryIds = new Map<string, string>();
  for (const name of BOOK_CATEGORIES) {
    const cat = await prisma.category.findUniqueOrThrow({
      where: { name_type: { name, type: CategoryType.BOOK } },
    });
    categoryIds.set(name, cat.id);
  }

  let copyCount = 0;
  for (const { copies, category, ...titleData } of BOOKS) {
    // Store a cover URL in imageUrl (issue #24). OpenLibrary serves real covers
    // by ISBN; the frontend falls back to the icon if it 404s. update: backfills
    // existing rows on re-seed.
    const imageUrl = `https://covers.openlibrary.org/b/isbn/${titleData.isbn.replace(/-/g, '')}-L.jpg`;
    const title = await prisma.bookTitle.upsert({
      where: { isbn: titleData.isbn },
      update: { imageUrl },
      create: {
        ...titleData,
        categoryId: categoryIds.get(category)!,
        language: 'English',
        imageUrl,
      },
    });

    for (const assetTag of copies) {
      await prisma.bookCopy.upsert({
        where: { assetTag },
        update: {},
        create: {
          bookTitleId: title.id,
          assetTag,
          status: ItemStatus.AVAILABLE,
        },
      });
      copyCount++;
    }
  }
  console.log(`  ✓ Book titles (${BOOKS.length}) and copies (${copyCount})`);
}

// ---- Devices ----

type SeedDevice = {
  assetTag: string;
  name: string;
  deviceTier: number;
  category: string;
};

// deviceTier matches the patron tier system: 4-5 require staff approval for checkout.
const DEVICES: SeedDevice[] = [
  // -- Laptops --
  {
    assetTag: 'DEV-MBP-001',
    name: 'MacBook Pro 16"',
    deviceTier: 5,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-MBP-002',
    name: 'MacBook Pro 16"',
    deviceTier: 5,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-XPS-001',
    name: 'Dell XPS 15',
    deviceTier: 4,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-XPS-002',
    name: 'Dell XPS 15',
    deviceTier: 4,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-MBA-001',
    name: 'MacBook Air M3',
    deviceTier: 4,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-MBA-002',
    name: 'MacBook Air M3',
    deviceTier: 4,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-SFP-001',
    name: 'Surface Pro 9',
    deviceTier: 4,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-LTP-001',
    name: 'Lenovo ThinkPad E15',
    deviceTier: 3,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-LTP-002',
    name: 'Lenovo ThinkPad E15',
    deviceTier: 3,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-ASP-001',
    name: 'Acer Aspire 5',
    deviceTier: 2,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-ASP-002',
    name: 'Acer Aspire 5',
    deviceTier: 2,
    category: 'Laptops',
  },
  {
    assetTag: 'DEV-HPP-001',
    name: 'HP Pavilion 15',
    deviceTier: 2,
    category: 'Laptops',
  },
  // -- Tablets --
  {
    assetTag: 'DEV-IPD-001',
    name: 'iPad Pro 12.9"',
    deviceTier: 3,
    category: 'Tablets',
  },
  {
    assetTag: 'DEV-IPD-002',
    name: 'iPad Pro 12.9"',
    deviceTier: 3,
    category: 'Tablets',
  },
  {
    assetTag: 'DEV-IPA-001',
    name: 'iPad Air',
    deviceTier: 2,
    category: 'Tablets',
  },
  {
    assetTag: 'DEV-TAB-001',
    name: 'Samsung Galaxy Tab S8',
    deviceTier: 2,
    category: 'Tablets',
  },
  {
    assetTag: 'DEV-TAB-002',
    name: 'Samsung Galaxy Tab S8',
    deviceTier: 2,
    category: 'Tablets',
  },
  // -- Cameras & AV --
  {
    assetTag: 'DEV-CAM-001',
    name: 'Canon EOS R50',
    deviceTier: 4,
    category: 'Cameras & AV',
  },
  {
    assetTag: 'DEV-CAM-002',
    name: 'Canon EOS R50',
    deviceTier: 4,
    category: 'Cameras & AV',
  },
  {
    assetTag: 'DEV-GOP-001',
    name: 'GoPro Hero 12',
    deviceTier: 3,
    category: 'Cameras & AV',
  },
  {
    assetTag: 'DEV-PRJ-001',
    name: 'Epson Portable Projector',
    deviceTier: 3,
    category: 'Cameras & AV',
  },
  {
    assetTag: 'DEV-MIC-001',
    name: 'Rode Podcast Mic Kit',
    deviceTier: 2,
    category: 'Cameras & AV',
  },
  // -- Accessories --
  {
    assetTag: 'DEV-CAL-001',
    name: 'Casio FX-991EX Calculator',
    deviceTier: 1,
    category: 'Accessories',
  },
  {
    assetTag: 'DEV-CAL-002',
    name: 'Casio FX-991EX Calculator',
    deviceTier: 1,
    category: 'Accessories',
  },
  {
    assetTag: 'DEV-HDP-001',
    name: 'Sony WH-1000XM5 Headphones',
    deviceTier: 2,
    category: 'Accessories',
  },
];

async function seedDevices() {
  const categoryIds = new Map<string, string>();
  for (const name of DEVICE_CATEGORIES) {
    const cat = await prisma.category.findUniqueOrThrow({
      where: { name_type: { name, type: CategoryType.DEVICE } },
    });
    categoryIds.set(name, cat.id);
  }

  for (const { category, ...d } of DEVICES) {
    // Placeholder device photo, deterministic per asset tag (issue #24).
    const imageUrl = `https://picsum.photos/seed/${d.assetTag}/600/400`;
    await prisma.device.upsert({
      where: { assetTag: d.assetTag },
      update: { imageUrl },
      create: {
        ...d,
        categoryId: categoryIds.get(category)!,
        status: ItemStatus.AVAILABLE,
        imageUrl,
      },
    });
  }
  console.log(`  ✓ Devices (${DEVICES.length})`);
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
      name: 'Study Room D',
      capacity: 4,
      features: ['whiteboard', 'AC'],
      roomQr: 'ROOM-QR-D',
    },
    {
      name: 'Study Room E',
      capacity: 6,
      features: ['whiteboard', 'TV screen', 'AC'],
      roomQr: 'ROOM-QR-E',
    },
    {
      name: 'Silent Pod 1',
      capacity: 1,
      features: ['power outlets', 'desk lamp'],
      roomQr: 'ROOM-QR-SP1',
    },
    {
      name: 'Silent Pod 2',
      capacity: 1,
      features: ['power outlets', 'desk lamp'],
      roomQr: 'ROOM-QR-SP2',
    },
    {
      name: 'Media Lab',
      capacity: 6,
      features: ['iMac workstations', 'audio booth', 'AC'],
      roomQr: 'ROOM-QR-ML',
    },
    {
      name: 'Group Hall',
      capacity: 20,
      features: ['projector', 'stage', 'AC'],
      roomQr: 'ROOM-QR-GH',
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
  console.log(`  ✓ Study rooms (${rooms.length})`);
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
  console.log(
    '  admin@iit.ac.lk | staff@iit.ac.lk | lecturer@iit.ac.lk | student@iit.ac.lk',
  );
  console.log(
    '  tier1.student@ | tier2.student@ | tier4.student@ | tier5.student@iit.ac.lk',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

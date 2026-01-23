const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const memberId = '550e8400-e29b-41d4-a716-446655440002';

    // Create Workspace
    await prisma.workspace.upsert({
        where: { id: workspaceId },
        update: {},
        create: {
            id: workspaceId,
            name: 'Auromind Admin',
            created_at: new Date(),
        },
    });

    // Create User
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: 'admin@gmail.com',
            full_name: 'Admin User',
            created_at: new Date(),
        },
    });

    // Create Workspace Member
    await prisma.workspaceMember.upsert({
        where: { id: memberId },
        update: {},
        create: {
            id: memberId,
            user_id: userId,
            workspace_id: workspaceId,
            role: 'owner',
            joined_at: new Date(),
        },
    });

    console.log('✅ Admin user and workspace seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

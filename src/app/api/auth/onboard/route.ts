import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { db } from '@/lib/db';

// POST /api/auth/onboard — Create a personal workspace for a new user
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name || 'User';

    // Create the personal organization with a unique slug
    const org = await db.organization.create({
      data: {
        name: `${userName}'s Workspace`,
        slug: `workspace-${userId.slice(0, 8)}`,
        plan: 'solo',
      },
    });

    // Link the user as owner
    await db.userOrganization.create({
      data: {
        userId,
        organizationId: org.id,
        role: 'owner',
      },
    });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// POST /api/auth/register — Create User + Organization + UserOrganization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, businessName } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 422 }
      );
    }

    // Password strength: minimum 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 422 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate organization slug from business name or name
    const orgName = businessName || `${name}'s Studio`;
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create User + Organization + UserOrganization in transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name },
      });

      const organization = await tx.organization.create({
        data: { name: orgName, slug },
      });

      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'owner',
        },
      });

      await tx.dashboardSettings.create({
        data: {
          organizationId: organization.id,
          businessName: orgName,
        },
      });

      return { user, organization };
    });

    logger.info(`User registered: ${result.user.email}, org: ${result.organization.name}`);

    // Return user without passwordHash
    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          avatar: result.user.avatar,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    logger.error('Registration error', { error });

    // Handle unique constraint violation on slug
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Organization name already taken, try a different one' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

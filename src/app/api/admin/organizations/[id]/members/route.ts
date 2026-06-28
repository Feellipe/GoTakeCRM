import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

// GET /api/admin/organizations/[id]/members — List members (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verify user is owner or admin of this organization
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all members with user data
    const members = await db.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/admin/organizations/[id]/members — Invite a member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verify user is owner or admin
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 422 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // Find or create user by email
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // User doesn't exist yet — create a placeholder
      user = await db.user.create({
        data: {
          email,
          name: email.split('@')[0],
        },
      });
    }

    // Check if already a member
    const existingMembership = await db.userOrganization.findFirst({
      where: { userId: user.id, organizationId },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      );
    }

    // Create membership
    const newMembership = await db.userOrganization.create({
      data: {
        userId: user.id,
        organizationId,
        role: body.role || 'member',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(newMembership, { status: 201 });
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/organizations/[id]/members — Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verify user is owner or admin
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.memberId || !body.role) {
      return NextResponse.json(
        { error: 'memberId and role are required' },
        { status: 422 }
      );
    }

    // Verify the member belongs to this org
    const targetMembership = await db.userOrganization.findFirst({
      where: { id: body.memberId, organizationId },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this organization' },
        { status: 404 }
      );
    }

    // Update role
    const updated = await db.userOrganization.update({
      where: { id: body.memberId },
      data: { role: body.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/organizations/[id]/members — Remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: organizationId } = await params;

    // Verify user is owner or admin
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 422 }
      );
    }

    // Cannot remove self
    if (body.memberId === membership.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 422 }
      );
    }

    // Verify the member belongs to this org
    const targetMembership = await db.userOrganization.findFirst({
      where: { id: body.memberId, organizationId },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this organization' },
        { status: 404 }
      );
    }

    await db.userOrganization.delete({
      where: { id: body.memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

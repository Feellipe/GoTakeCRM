import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

const whatsappUpdateSchema = z.object({
  whatsappPhoneId: z.string().optional(),
  whatsappToken: z.string().optional(),
  whatsappPhone: z.string().optional(),
});

// PATCH /api/admin/organizations/[id]/whatsapp — Update WhatsApp credentials for an organization
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

    // Verify user is owner of this organization
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: 'owner',
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden: not an owner of this organization' },
        { status: 403 }
      );
    }

    const rawBody = await request.json();
    const parsed = whatsappUpdateSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`
      );
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 422 }
      );
    }

    // Build update data — only include provided fields
    const updateData: Record<string, string> = {};
    if (parsed.data.whatsappPhoneId !== undefined) {
      updateData.whatsappPhoneId = parsed.data.whatsappPhoneId;
    }
    if (parsed.data.whatsappToken !== undefined) {
      updateData.whatsappToken = parsed.data.whatsappToken;
    }
    if (parsed.data.whatsappPhone !== undefined) {
      updateData.whatsappPhone = parsed.data.whatsappPhone;
    }

    const org = await db.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    // Return org without the token for security
    const { whatsappToken: _, ...safeOrg } = org;

    return NextResponse.json(safeOrg);
  } catch (error) {
    console.error('Error updating WhatsApp credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update WhatsApp credentials' },
      { status: 500 }
    );
  }
}

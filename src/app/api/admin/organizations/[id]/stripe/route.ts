import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';

const stripeUpdateSchema = z.object({
  stripePublicKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
});

function maskSecretKey(key: string | null | undefined): string | null {
  if (!key) return key ?? null;
  if (key.length <= 8) return '••••';
  return key.slice(0, 8) + '••••';
}

// PATCH /api/admin/organizations/[id]/stripe — Update Stripe credentials for an organization
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

    // Verify user is owner or admin of this organization
    const membership = await db.userOrganization.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['owner', 'admin'] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden: not authorized for this organization' },
        { status: 403 }
      );
    }

    const rawBody = await request.json();
    const parsed = stripeUpdateSchema.safeParse(rawBody);

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
    if (parsed.data.stripePublicKey !== undefined) {
      updateData.stripePublicKey = parsed.data.stripePublicKey;
    }
    if (parsed.data.stripeSecretKey !== undefined) {
      updateData.stripeSecretKey = parsed.data.stripeSecretKey;
    }
    if (parsed.data.stripeWebhookSecret !== undefined) {
      updateData.stripeWebhookSecret = parsed.data.stripeWebhookSecret;
    }

    const org = await db.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    // Mask secret keys in response for security
    const safeOrg = {
      ...org,
      stripeSecretKey: maskSecretKey(org.stripeSecretKey),
      stripeWebhookSecret: maskSecretKey(org.stripeWebhookSecret),
    };

    return NextResponse.json(safeOrg);
  } catch (error) {
    console.error('Error updating Stripe credentials:', error);
    return NextResponse.json(
      { error: 'Failed to update Stripe credentials' },
      { status: 500 }
    );
  }
}

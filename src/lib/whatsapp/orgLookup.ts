import { db } from '@/lib/db';

export interface OrgWhatsAppConfig {
  id: string;
  token: string;
  phoneId: string;
}

/**
 * Looks up an Organization by its WhatsApp Phone Number ID.
 *
 * Returns the org's WhatsApp credentials (token + phoneId) so the caller
 * can send messages scoped to that org. Returns `null` if no matching
 * org is found or if the org lacks valid WhatsApp credentials.
 *
 * @param phoneNumberId - The WhatsApp Business Phone Number ID (from webhook payload metadata)
 * @returns OrgWhatsAppConfig with id, token, phoneId, or null
 */
export async function getOrgByPhoneNumberId(
  phoneNumberId: string
): Promise<OrgWhatsAppConfig | null> {
  const org = await db.organization.findUnique({
    where: { whatsappPhoneId: phoneNumberId },
    select: { id: true, whatsappToken: true, whatsappPhoneId: true },
  });

  if (!org || !org.whatsappToken || !org.whatsappPhoneId) {
    return null;
  }

  return {
    id: org.id,
    token: org.whatsappToken,
    phoneId: org.whatsappPhoneId,
  };
}

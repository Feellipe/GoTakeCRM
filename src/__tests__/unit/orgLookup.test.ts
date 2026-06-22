import { describe, it, expect, vi } from 'vitest';

// The db mock is already set up globally in setup.ts
// We import it to control return values in each test
const { db } = await import('@/lib/db');

const { getOrgByPhoneNumberId } = await import('@/lib/whatsapp/orgLookup');

describe('getOrgByPhoneNumberId', () => {
  const PHONE_NUMBER_ID = 'whatsapp-phone-id-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns org config when org is found with valid token and phoneId', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-1',
      whatsappToken: 'test-token-abc',
      whatsappPhoneId: PHONE_NUMBER_ID,
    });

    const result = await getOrgByPhoneNumberId(PHONE_NUMBER_ID);

    expect(db.organization.findUnique).toHaveBeenCalledWith({
      where: { whatsappPhoneId: PHONE_NUMBER_ID },
      select: { id: true, whatsappToken: true, whatsappPhoneId: true },
    });
    expect(result).toEqual({
      id: 'org-1',
      token: 'test-token-abc',
      phoneId: PHONE_NUMBER_ID,
    });
  });

  it('returns null when no org matches the phone_number_id', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue(null);

    const result = await getOrgByPhoneNumberId('non-existent-id');

    expect(result).toBeNull();
  });

  it('returns null when org found but whatsappToken is null', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-2',
      whatsappToken: null,
      whatsappPhoneId: PHONE_NUMBER_ID,
    });

    const result = await getOrgByPhoneNumberId(PHONE_NUMBER_ID);

    expect(result).toBeNull();
  });

  it('returns null when org found but whatsappPhoneId is null', async () => {
    vi.mocked(db.organization.findUnique).mockResolvedValue({
      id: 'org-3',
      whatsappToken: 'test-token-xyz',
      whatsappPhoneId: null,
    });

    const result = await getOrgByPhoneNumberId(PHONE_NUMBER_ID);

    expect(result).toBeNull();
  });
});

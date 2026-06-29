import type { Repository } from 'typeorm';
import type { WarrantyRegistrationEntity } from '../entities/warranty-registration.entity.js';

/**
 * Resolve a valid warranty_registrations.id for a claim.
 * - Returns the ID only if it exists for this appliance.
 * - Ignores invented/non-UUID values from the chatbot (e.g. "23424244").
 * - Falls back to the customer's warranty on this appliance by email.
 */
export async function resolveClaimWarrantyId(
  warrantyRepo: Repository<WarrantyRegistrationEntity>,
  applianceId: string,
  warrantyId?: string | null,
  customerEmail?: string | null,
): Promise<string | null> {
  const trimmed = warrantyId?.trim();
  if (trimmed) {
    const found = await warrantyRepo.findOne({
      where: { id: trimmed, appliance_id: applianceId },
    });
    if (found) return found.id;
  }

  const email = customerEmail?.trim();
  if (email) {
    const byEmail = await warrantyRepo.findOne({
      where: { appliance_id: applianceId, customer_email: email },
      order: { created_at: 'DESC' },
    });
    if (byEmail) return byEmail.id;
  }

  return null;
}

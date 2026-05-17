// Entity exports in dependency order to avoid circular import issues
// Core business entities first
export { BusinessEntity } from './business.entity.js';
export { UserEntity } from './user.entity.js';

// Appliance-related entities
export { ApplianceEntity } from './appliance.entity.js';
export { QrCodeEntity } from './qr-code.entity.js';
export { DocumentEntity } from './document.entity.js';
export { WarrantyRegistrationEntity } from './warranty-registration.entity.js';

// Service entities
export { ClaimEntity } from './claim.entity.js';
export { BookingEntity } from './booking.entity.js';
export { ChatSessionEntity } from './chat-session.entity.js';
export { MessageEntity } from './message.entity.js';

// Support entities
export { NotificationEntity } from './notification.entity.js';
export { ActivityEntity } from './activity.entity.js';
export { OfferEntity } from './offer.entity.js';

/**
 * Meta WhatsApp Cloud API Error Classification and Troubleshooting Utilities
 * Provides human-readable descriptions, categories, and actionable guidance for campaign errors.
 */

export const META_ERROR_CATALOG = {
  '131049': {
    code: '131049',
    title: 'Marketing Message Frequency Cap Reached',
    category: 'WhatsApp Policy & Frequency Limit',
    whatThisMeans:
      'WhatsApp limits how many marketing template messages a single user can receive across all businesses in a given timeframe to protect user experience.',
    whatYouCanDo:
      'No action needed on your account. The message was skipped safely without counting against your campaign deliverability. You can re-target this contact in a subsequent campaign after 24–48 hours.',
  },
  '131026': {
    code: '131026',
    title: 'Message Undeliverable / Recipient Unavailable',
    category: 'Recipient Status',
    whatThisMeans:
      'The recipient phone number is either not registered on WhatsApp, has blocked business messages, or is temporarily unreachable (device powered off/offline for >14 days).',
    whatYouCanDo:
      'Verify the recipient’s WhatsApp registration status. If the contact is inactive, remove or update the phone number in your CRM list to improve deliverability rates.',
  },
  '131047': {
    code: '131047',
    title: '24-Hour Customer Service Window Closed',
    category: 'Session Policy',
    whatThisMeans:
      'Free-form session messages can only be sent within 24 hours of the user’s last message. After 24 hours, only approved Meta templates can be sent.',
    whatYouCanDo:
      'Ensure you select an approved Meta template for outbound broadcasts, or wait for the user to initiate a new conversation.',
  },
  '130429': {
    code: '130429',
    title: 'Cloud API Rate Limit Exceeded',
    category: 'API Rate Limit',
    whatThisMeans:
      'Your WhatsApp Business Account has temporarily exceeded the allowed requests per second throughput limit.',
    whatYouCanDo:
      'The platform automatically throttles and retries rate-limited requests. Consider lowering the sending rate per minute in Campaign Schedule settings.',
  },
  '131051': {
    code: '131051',
    title: 'Unsupported Message Type',
    category: 'Payload Format',
    whatThisMeans:
      'The message content or attachment format is not supported by the recipient’s WhatsApp client version.',
    whatYouCanDo:
      'Use standard image (JPG, PNG), document (PDF), or video (MP4) formats supported by WhatsApp.',
  },
  '131052': {
    code: '131052',
    title: 'Media Download / Upload Failed',
    category: 'Media Attachment',
    whatThisMeans:
      'WhatsApp servers could not fetch the media file from the provided media URL, or the file size exceeded the Meta limit.',
    whatYouCanDo:
      'Verify that the media URL is publicly accessible (HTTPS) and does not require authentication. Ensure file size is within limits (Images: 5MB, Videos: 16MB, Documents: 100MB).',
  },
  '132000': {
    code: '132000',
    title: 'Template Variable Parameter Mismatch',
    category: 'Template Formatting',
    whatThisMeans:
      'The number of variables provided in the campaign does not match the parameters expected by the approved template.',
    whatYouCanDo:
      'Check the template definition and ensure all required variables (e.g. {{1}}, {{2}}) have mapped values or fallbacks.',
  },
  '132001': {
    code: '132001',
    title: 'Template Not Found or Not Approved',
    category: 'Template Status',
    whatThisMeans:
      'The selected template ID is not found or is still pending/rejected in Meta Business Manager.',
    whatYouCanDo:
      'Select only templates marked as "APPROVED" in Template Studio before launching the campaign.',
  },
  '132005': {
    code: '132005',
    title: 'Template Language or Locale Mismatch',
    category: 'Template Formatting',
    whatThisMeans:
      'The template language code specified does not match the approved translation in WhatsApp Business Manager.',
    whatYouCanDo:
      'Ensure the campaign language matches the approved template language (e.g., en_US).',
  },
  '133010': {
    code: '133010',
    title: 'WhatsApp Business Account Restricted or Inactive',
    category: 'Account Compliance',
    whatThisMeans:
      'Your Meta WhatsApp Business Account has policy restrictions, unverified payment method, or pending compliance verification.',
    whatYouCanDo:
      'Log in to Meta WhatsApp Business Manager (business.facebook.com) and check your Account Quality tab to resolve restrictions.',
  },
  'SKIPPED_INVALID': {
    code: 'SKIPPED_INVALID',
    title: 'Invalid Phone Number Format',
    category: 'Recipient Validation',
    whatThisMeans:
      'The phone number does not conform to the E.164 international standard (missing country code or insufficient digits).',
    whatYouCanDo:
      'Ensure phone numbers include the full country code without extra symbols (e.g., +91 9840123456).',
  },
  'SKIPPED_OPTED_OUT': {
    code: 'SKIPPED_OPTED_OUT',
    title: 'Recipient Opted Out',
    category: 'Compliance & Consent',
    whatThisMeans:
      'The contact has previously unsubscribed or requested not to receive marketing communications.',
    whatYouCanDo:
      'Respect user consent. Do not attempt to re-message unsubscribed contacts without explicit re-opt-in.',
  },
  'HELD_PORTFOLIO_LIMIT': {
    code: 'HELD_PORTFOLIO_LIMIT',
    title: '24-Hour Messaging Tier Limit Reached',
    category: 'Portfolio Tier Capacity',
    whatThisMeans:
      'You have reached your current 24-hour unique business-initiated conversation tier limit set by Meta.',
    whatYouCanDo:
      'Your campaign will automatically resume once your 24-hour quota rolls over tomorrow. Maintain high message quality to automatically upgrade your tier limit.',
  },
};

/**
 * Classifies an error code and message into human-friendly troubleshooting details.
 *
 * @param {string|number} errorCode - The error code or status string
 * @param {string} [errorMessage] - Optional raw error message
 * @returns {{ code: string, title: string, category: string, whatThisMeans: string, whatYouCanDo: string }}
 */
export function classifyMetaError(errorCode, errorMessage = '') {
  const codeStr = String(errorCode || '').trim().toUpperCase();

  if (META_ERROR_CATALOG[codeStr]) {
    return META_ERROR_CATALOG[codeStr];
  }

  // Check by partial match or semantic status
  if (codeStr.includes('131049') || codeStr.includes('FREQUENCY') || codeStr.includes('CAP')) {
    return META_ERROR_CATALOG['131049'];
  }
  if (codeStr.includes('131026') || codeStr.includes('UNDELIVERABLE')) {
    return META_ERROR_CATALOG['131026'];
  }
  if (codeStr.includes('131047') || codeStr.includes('24H') || codeStr.includes('WINDOW')) {
    return META_ERROR_CATALOG['131047'];
  }
  if (codeStr.includes('130429') || codeStr.includes('RATE_LIMIT') || codeStr === '429') {
    return META_ERROR_CATALOG['130429'];
  }
  if (codeStr.includes('INVALID') || codeStr.includes('PHONE')) {
    return META_ERROR_CATALOG['SKIPPED_INVALID'];
  }
  if (codeStr.includes('OPT_OUT') || codeStr.includes('OPTED_OUT')) {
    return META_ERROR_CATALOG['SKIPPED_OPTED_OUT'];
  }
  if (codeStr.includes('PORTFOLIO') || codeStr.includes('TIER')) {
    return META_ERROR_CATALOG['HELD_PORTFOLIO_LIMIT'];
  }

  // Fallback for generic or unknown errors
  return {
    code: codeStr || 'UNKNOWN',
    title: errorMessage || 'Message Delivery Unsuccessful',
    category: 'General Delivery Issue',
    whatThisMeans:
      errorMessage ||
      'WhatsApp Cloud API was unable to deliver the message to the destination phone number.',
    whatYouCanDo:
      'Verify that the recipient number is valid, connected to WhatsApp, and that your template meets Meta Business policies.',
  };
}

export default {
  META_ERROR_CATALOG,
  classifyMetaError,
};

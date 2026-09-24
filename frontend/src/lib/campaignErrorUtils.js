
export const META_ERROR_CATALOG = {
  '131026': {
    category: 'RECIPIENT_UNDELIVERABLE',
    title: 'Recipient cannot receive this message',
    whatThisMeans:
      'WhatsApp was unable to deliver the message to this number. This usually happens when the phone number is not active on WhatsApp, the device has been offline/turned off for an extended period, or the recipient has blocked business messaging. The exact underlying reason may not always be disclosed by Meta to protect user privacy.',
    whatYouCanDo:
      'Check whether this number is active on WhatsApp before sending again. You can also contact the customer via SMS or call to verify their phone number.',
    severity: 'error',
    isRetryable: false,
  },
  '131049': {
    category: 'MARKETING_RECIPIENT_LIMIT',
    title: 'Marketing message limit reached',
    whatThisMeans:
      'Meta limited delivery to protect the WhatsApp user experience. This recipient has reached their marketing-message limit set by Meta to prevent message fatigue and maintain healthy user engagement.',
    whatYouCanDo:
      'Do not retry sending immediately. Try sending at a later date, or use an approved Utility or Service template if your message is non-promotional.',
    severity: 'warning',
    isRetryable: true,
  },
  '131047': {
    category: 'CUSTOMER_SERVICE_WINDOW_EXPIRED',
    title: 'Customer service window expired',
    whatThisMeans:
      'More than 24 hours have passed since the customer last replied. WhatsApp requires an approved template message to re-open the conversation window.',
    whatYouCanDo:
      'Send an approved Meta template message instead of a free-form custom message to re-open the 24-hour window.',
    severity: 'warning',
    isRetryable: false,
  },
  '131056': {
    category: 'RECIPIENT_PAIR_RATE_LIMIT',
    title: 'Too many messages sent to recipient too quickly',
    whatThisMeans:
      'WhatsApp temporarily limited messages to this recipient because too many messages were sent to this specific recipient pair in a short period of time.',
    whatYouCanDo:
      'Slow down messages to this number and try again after a few hours.',
    severity: 'warning',
    isRetryable: true,
  },
  '130429': {
    category: 'THROUGHPUT_RATE_LIMIT',
    title: 'Sending speed limit reached',
    whatThisMeans:
      'Your WhatsApp Business phone number reached its message throughput limit (messages per second). This is an account-level sending speed limit, not an individual recipient issue.',
    whatYouCanDo:
      'Slow down the campaign sending rate (messages per minute). The campaign will automatically pace and continue when capacity is available.',
    severity: 'warning',
    isRetryable: true,
  },
  '131009': {
    category: 'INVALID_PARAMETER',
    title: 'Parameter value is invalid',
    whatThisMeans:
      'One or more parameter values or variables supplied in the message template do not match the expected format, length, or character requirements.',
    whatYouCanDo:
      'Review your campaign variable mapping and ensure recipient fields (e.g. name or amounts) do not contain excessive length or invalid characters.',
    severity: 'error',
    isRetryable: false,
  },
  '131008': {
    category: 'REQUIRED_PARAMETER_MISSING',
    title: 'Required parameter is missing',
    whatThisMeans:
      'The approved template expects parameters (such as {{1}} or {{2}}), but one or more values were not provided.',
    whatYouCanDo:
      'Verify that all template placeholders have corresponding variable mappings in your audience list.',
    severity: 'error',
    isRetryable: false,
  },
  '131051': {
    category: 'UNSUPPORTED_MESSAGE_TYPE',
    title: 'Unsupported message type',
    whatThisMeans:
      'The message type or media attachment format is not supported by WhatsApp Business API.',
    whatYouCanDo:
      'Ensure attachments use supported formats (JPG, PNG, MP4, PDF) and stay within Meta file size limits.',
    severity: 'error',
    isRetryable: false,
  },
  '131052': {
    category: 'MEDIA_DOWNLOAD_ERROR',
    title: 'Media download error',
    whatThisMeans:
      'WhatsApp servers were unable to download media from the provided URL.',
    whatYouCanDo:
      'Ensure the media URL is publicly accessible over HTTPS and does not require private authentication.',
    severity: 'error',
    isRetryable: true,
  },
  '131053': {
    category: 'MEDIA_UPLOAD_ERROR',
    title: 'Media upload error',
    whatThisMeans:
      'WhatsApp failed to process or store the uploaded media asset.',
    whatYouCanDo:
      'Verify that the media file is not corrupted and try uploading the file again.',
    severity: 'error',
    isRetryable: true,
  },
  '132000': {
    category: 'TEMPLATE_NOT_FOUND',
    title: 'Template does not exist',
    whatThisMeans:
      'The template name or language code does not exist in your WhatsApp Business Account.',
    whatYouCanDo:
      'Verify the template name and language in Meta WhatsApp Manager and synchronize templates.',
    severity: 'error',
    isRetryable: false,
  },
  '132001': {
    category: 'TEMPLATE_NOT_APPROVED',
    title: 'Template is not approved',
    whatThisMeans:
      'The template has not been approved by Meta yet, or has been paused or rejected.',
    whatYouCanDo:
      'Check template approval status in WhatsApp Manager. Messages can only be dispatched using APPROVED templates.',
    severity: 'error',
    isRetryable: false,
  },
  '132005': {
    category: 'TEMPLATE_VARIABLE_MISMATCH',
    title: 'Template variable count mismatch',
    whatThisMeans:
      'The number of variable values provided does not match the placeholder count in the template definition.',
    whatYouCanDo:
      'Ensure the number of values passed matches the template placeholder count.',
    severity: 'error',
    isRetryable: false,
  },
  '130428': {
    category: 'CLOUD_API_RATE_LIMIT',
    title: 'Cloud API rate limit hit',
    whatThisMeans:
      'Your application has temporarily exceeded the Meta Cloud API request rate limit.',
    whatYouCanDo:
      'The system will automatically back off and retry. Consider lowering the campaign dispatch speed.',
    severity: 'warning',
    isRetryable: true,
  },
  '131057': {
    category: 'ACCOUNT_RESTRICTED',
    title: 'Account sending restricted',
    whatThisMeans:
      'Your WhatsApp Business phone number has been temporarily restricted due to policy or quality rating violations.',
    whatYouCanDo:
      'Check WhatsApp Manager quality rating and review Meta policy notifications.',
    severity: 'error',
    isRetryable: false,
  },
  '133010': {
    category: 'PHONE_NUMBER_NOT_REGISTERED',
    title: 'Phone number not registered',
    whatThisMeans:
      'The recipient’s phone number is not registered on WhatsApp.',
    whatYouCanDo:
      'Remove this contact from the audience or verify their active WhatsApp number.',
    severity: 'error',
    isRetryable: false,
  },
  SKIPPED_INVALID: {
    category: 'INVALID_PHONE_NUMBER',
    title: 'Invalid phone number format',
    whatThisMeans:
      'The phone number is missing a valid country code or has an incorrect number of digits.',
    whatYouCanDo:
      'Format numbers in standard E.164 format with country code (e.g. +91 98765 43210).',
    severity: 'warning',
    isRetryable: false,
  },
  SKIPPED_OPTED_OUT: {
    category: 'CONTACT_OPTED_OUT',
    title: 'Contact opted out',
    whatThisMeans:
      'The recipient previously requested to unsubscribe or opt out from marketing communications.',
    whatYouCanDo:
      'Do not contact this recipient for marketing purposes. Respect customer preferences.',
    severity: 'info',
    isRetryable: false,
  },
  PORTFOLIO_TIER_LIMIT: {
    category: 'PORTFOLIO_DAILY_LIMIT',
    title: '24-hour portfolio limit reached',
    whatThisMeans:
      'Your Meta WhatsApp Business account reached its daily unique recipient tier limit.',
    whatYouCanDo:
      'The campaign is paused and will automatically resume once the 24-hour window rolls over.',
    severity: 'warning',
    isRetryable: true,
  },
};

const DEFAULT_ERROR = {
  category: 'GENERAL_DELIVERY_FAILURE',
  title: 'Message delivery failed',
  whatThisMeans:
    'WhatsApp was unable to deliver this message. Meta returned an error during transmission or delivery confirmation.',
  whatYouCanDo:
    'Check recipient phone number validity and inspect the error details before retrying.',
  severity: 'error',
  isRetryable: true,
};

export function classifyMetaError(errorCode, rawMessage = '') {
  const codeStr = String(errorCode || '').trim().toUpperCase();

  if (META_ERROR_CATALOG[codeStr]) {
    return {
      errorCode: codeStr,
      ...META_ERROR_CATALOG[codeStr],
    };
  }

  const rawLower = String(rawMessage || '').toLowerCase();
  if (rawLower.includes('131049') || (rawLower.includes('marketing') && rawLower.includes('limit')) || rawLower.includes('engagement')) {
    return { errorCode: '131049', ...META_ERROR_CATALOG['131049'] };
  }
  if (rawLower.includes('131026') || rawLower.includes('undeliverable') || rawLower.includes('cannot receive')) {
    return { errorCode: '131026', ...META_ERROR_CATALOG['131026'] };
  }
  if (rawLower.includes('131047') || rawLower.includes('window')) {
    return { errorCode: '131047', ...META_ERROR_CATALOG['131047'] };
  }
  if (rawLower.includes('131056') || rawLower.includes('rate limit') || rawLower.includes('too many')) {
    return { errorCode: '131056', ...META_ERROR_CATALOG['131056'] };
  }
  if (rawLower.includes('invalid') && rawLower.includes('number')) {
    return { errorCode: 'SKIPPED_INVALID', ...META_ERROR_CATALOG.SKIPPED_INVALID };
  }
  if (rawLower.includes('opt_out') || rawLower.includes('opted out')) {
    return { errorCode: 'SKIPPED_OPTED_OUT', ...META_ERROR_CATALOG.SKIPPED_OPTED_OUT };
  }

  const res = { errorCode: codeStr || 'FAILED', ...DEFAULT_ERROR };
  if (rawMessage && rawMessage.trim()) {
    const cleanMsg = rawMessage.split(':')[0].trim();
    if (cleanMsg.length < 60 && !['failed', 'delivery failed', 'unknown'].includes(cleanMsg.toLowerCase())) {
      res.title = cleanMsg;
    }
  }
  return res;
}

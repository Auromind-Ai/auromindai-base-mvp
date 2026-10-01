/**
 * Variable System Configuration and Helpers for WhatsApp Templates
 * 
 * Supports:
 * - Hierarchical variable categories: Contact, CRM, Custom Fields
 * - Dynamic mapping between meaningful names (e.g. {{customer_name}}) and WhatsApp numbers (e.g. {{1}})
 * - Sample data inference for preview rendering
 */

export const VARIABLE_CATEGORIES = [
  {
    id: 'contact',
    label: 'Contact',
    icon: 'user',
    description: 'Personal details of the contact / lead',
    variables: [
      { id: 'customer_name', label: 'First Name', key: 'customer_name', defaultNumber: '1', sample: 'John' },
      { id: 'last_name', label: 'Last Name', key: 'last_name', sample: 'Doe' },
      { id: 'phone', label: 'Phone', key: 'phone', sample: '+1 (555) 234-5678' },
      { id: 'email', label: 'Email', key: 'email', sample: 'john@example.com' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'briefcase',
    description: 'Lead & deal tracking attributes',
    variables: [
      { id: 'lead_status', label: 'Lead Status', key: 'lead_status', sample: 'Qualified' },
      { id: 'lifecycle_stage', label: 'Lifecycle Stage', key: 'lifecycle_stage', sample: 'Opportunity' },
      { id: 'company', label: 'Company', key: 'company', sample: 'Acme Corp' },
      { id: 'deal_value', label: 'Deal Value', key: 'deal_value', sample: '$5,000' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Fields',
    icon: 'sliders',
    description: 'Business-specific attributes & plan details',
    variables: [
      { id: 'product_name', label: 'Product Name', key: 'product_name', sample: 'Orbion Pro' },
      { id: 'plan_name', label: 'Plan Name', key: 'plan_name', defaultNumber: '2', sample: 'Pro' },
      { id: 'amount', label: 'Amount', key: 'amount', defaultNumber: '3', sample: '$49.00' },
      { id: 'otp_code', label: 'OTP Code', key: 'otp_code', defaultNumber: '1', sample: '492018' },
      { id: 'verification_code', label: 'Verification Code', key: 'verification_code', sample: '891024' },
      { id: 'order_id', label: 'Order ID', key: 'order_id', sample: 'ORD-9821' },
      { id: 'appointment_date', label: 'Appointment Date', key: 'appointment_date', sample: 'Tomorrow at 3:00 PM' },
    ],
    hasCustomInput: true,
  },
];

// Flat lookup table for fast access
export const ALL_KNOWN_VARIABLES = VARIABLE_CATEGORIES.flatMap((c) =>
  c.variables.map((v) => ({ ...v, category: c.label, categoryId: c.id }))
);

/**
 * Clean and format a string into a valid variable name:
 * e.g. "Customer Name" -> "customer_name"
 */
export function sanitizeVariableName(input) {
  if (!input) return '';
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[{}\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

/**
 * Format variable name as display label
 * e.g. "customer_name" -> "Customer Name"
 */
export function formatVariableLabel(key) {
  if (!key) return '';
  const known = ALL_KNOWN_VARIABLES.find((v) => v.key === key || v.id === key);
  if (known) return known.label;

  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Get sample value for a variable for realistic preview
 */
export function getSampleValue(key) {
  const clean = sanitizeVariableName(key);
  const known = ALL_KNOWN_VARIABLES.find((v) => v.key === clean || v.id === clean);
  if (known?.sample) return known.sample;

  if (clean.includes('otp') || clean.includes('passcode') || clean.includes('verification')) return '492018';
  if (clean.includes('name')) return 'John';
  if (clean.includes('plan')) return 'Pro';
  if (clean.includes('amount') || clean.includes('price') || clean.includes('cost')) return '$49.00';
  if (clean.includes('order')) return 'ORD-1029';
  if (clean.includes('date') || clean.includes('time')) return 'Tomorrow at 3 PM';
  if (clean.includes('company')) return 'Acme Inc';
  if (clean.includes('phone')) return '+1 (555) 019-2834';
  if (clean.includes('email')) return 'customer@example.com';
  if (clean.includes('code')) return 'SAVE20';

  return `[${formatVariableLabel(key)}]`;
}

/**
 * Extract all variable tags (e.g. {{customer_name}}, {{1}}) from text in order of appearance
 */
export function extractVariables(text) {
  if (!text) return [];
  const matches = text.match(/\{\{([^{}]+)\}\}/g) || [];
  const list = [];
  const seen = new Set();

  matches.forEach((raw) => {
    const inner = raw.slice(2, -2).trim();
    if (!inner) return;
    const isNumbered = /^\d+$/.test(inner);
    const key = isNumbered ? inner : sanitizeVariableName(inner);
    if (!seen.has(key)) {
      seen.add(key);
      list.push({
        raw,
        key,
        inner,
        isNumbered,
        number: isNumbered ? parseInt(inner, 10) : null,
      });
    }
  });

  return list;
}

/**
 * Build bidirectional mapping between meaningful variable names and WhatsApp numbered placeholders.
 * 
 * Given editor text:
 * "Hi {{customer_name}}, Your {{plan_name}} plan is ready. Amount: {{amount}}"
 * 
 * Returns:
 * - numberedText: "Hi {{1}}, Your {{2}} plan is ready. Amount: {{3}}"
 * - mapping: { "1": "customer_name", "2": "plan_name", "3": "amount" }
 * - reverseMapping: { "customer_name": "1", "plan_name": "2", "amount": "3" }
 * - variableList: [ { key: "customer_name", number: "1", label: "First Name" }, ... ]
 */
export function buildWhatsAppVariableMapping(text, initialMapping = {}) {
  if (!text) {
    return {
      numberedText: '',
      mapping: {},
      reverseMapping: {},
      variableList: [],
    };
  }

  // Normalize single braces {var} to {{var}}
  let workingText = text.replace(/(?<!\{)\{([^{}]+)\}(?!\})/g, '{{$1}}');

  const rawTags = workingText.match(/\{\{([^{}]+)\}\}/g) || [];
  const mapping = {}; // "1": "customer_name"
  const reverseMapping = {}; // "customer_name": "1"

  // Pre-seed any explicitly provided mappings
  if (initialMapping && typeof initialMapping === 'object') {
    Object.entries(initialMapping).forEach(([k, v]) => {
      const cleanK = String(k).replace(/[{}]/g, '').trim();
      const cleanV = String(v).replace(/[{}]/g, '').trim();
      if (/^\d+$/.test(cleanK) && cleanV) {
        mapping[cleanK] = cleanV;
        reverseMapping[cleanV] = cleanK;
      } else if (/^\d+$/.test(cleanV) && cleanK) {
        mapping[cleanV] = cleanK;
        reverseMapping[cleanK] = cleanV;
      }
    });
  }

  // Iterate over detected tags in text in order of appearance
  let nextSequential = 1;
  const uniqueKeysInOrder = [];

  rawTags.forEach((tag) => {
    const inner = tag.slice(2, -2).trim();
    if (!inner) return;

    if (/^\d+$/.test(inner)) {
      // It's already a numbered variable
      const numStr = inner;
      if (!mapping[numStr]) {
        // If undefined, default name or keep as is
        mapping[numStr] = mapping[numStr] || `var_${numStr}`;
      }
      reverseMapping[mapping[numStr]] = numStr;
      if (!uniqueKeysInOrder.includes(mapping[numStr])) {
        uniqueKeysInOrder.push(mapping[numStr]);
      }
    } else {
      // It's a named variable like customer_name
      const cleanName = sanitizeVariableName(inner);
      if (!reverseMapping[cleanName]) {
        // Find next unused sequential index
        while (mapping[String(nextSequential)]) {
          nextSequential++;
        }
        const numStr = String(nextSequential);
        mapping[numStr] = cleanName;
        reverseMapping[cleanName] = numStr;
        nextSequential++;
      }
      if (!uniqueKeysInOrder.includes(cleanName)) {
        uniqueKeysInOrder.push(cleanName);
      }
    }
  });

  // Generate WhatsApp numbered text
  const numberedText = workingText.replace(/\{\{([^{}]+)\}\}/g, (match, inner) => {
    const trimmed = inner.trim();
    if (/^\d+$/.test(trimmed)) {
      return `{{${trimmed}}}`;
    }
    const cleanName = sanitizeVariableName(trimmed);
    const assignedNumber = reverseMapping[cleanName];
    return assignedNumber ? `{{${assignedNumber}}}` : match;
  });

  const variableList = uniqueKeysInOrder.map((name) => {
    const num = reverseMapping[name];
    return {
      key: name,
      number: num,
      whatsappTag: `{{${num}}}`,
      namedTag: `{{${name}}}`,
      label: formatVariableLabel(name),
      sample: getSampleValue(name),
    };
  });

  return {
    numberedText,
    mapping,
    reverseMapping,
    variableList,
  };
}

/**
 * Replace WhatsApp numbered placeholders (e.g. {{1}}, {{[1]}}) with meaningful named variables
 * (e.g. {{customer_name}}, {{plan_name}}) based on mapping.
 */
export function convertNumberedToNamedText(text, mapping = {}, category = '') {
  if (!text) return '';
  let mapObj = mapping;
  if (typeof mapping === 'string') {
    try {
      mapObj = JSON.parse(mapping);
    } catch (e) {
      mapObj = {};
    }
  }
  mapObj = mapObj || {};

  // Normalize single-brace {var} to double {{var}}
  let normalized = String(text).replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (_, v) => '{{' + v + '}}');

  return normalized.replace(/\{\{\[?(\d+)\]?\}\}/g, (match, num) => {
    const mappedName = mapObj[num] || mapObj[parseInt(num, 10)];
    if (mappedName) {
      return `{{${mappedName}}}`;
    }
    if (String(category).toUpperCase() === 'AUTHENTICATION') {
      return '{{otp_code}}';
    }
    if (num === '1') {
      return '{{customer_name}}';
    }
    return `{{var_${num}}}`;
  });
}

/**
 * Render message preview replacing variable placeholders with realistic sample values
 */
export function renderPreviewText(text, mapping = {}, mode = 'samples') {
  if (!text) return '';
  // Normalize single-brace {var} to double {{var}}
  const normalized = String(text).replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (_, v) => '{{' + v + '}}');

  if (mode === 'variables') {
    // Show named variables in preview (e.g. Hi {{customer_name}})
    return convertNumberedToNamedText(normalized, mapping);
  }

  // Render with realistic samples
  return normalized.replace(/\{\{([^{}]+)\}\}/g, (match, inner) => {
    const trimmed = inner.trim();
    if (/^\d+$/.test(trimmed)) {
      const mapped = mapping[trimmed];
      return getSampleValue(mapped || trimmed);
    }
    return getSampleValue(trimmed);
  });
}

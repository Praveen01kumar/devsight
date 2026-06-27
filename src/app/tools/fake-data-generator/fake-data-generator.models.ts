import { GeneratorTemplate, FieldType } from './fake-data-generator.interfaces';

export const LOCALES = [
  { code: 'en', name: 'United States (English)' },
  { code: 'en_IN', name: 'India (English/Hindi)' },
  { code: 'en_GB', name: 'United Kingdom (English)' },
  { code: 'de', name: 'Germany (Deutsch)' },
  { code: 'fr', name: 'France (Français)' },
  { code: 'en_CA', name: 'Canada (English/French)' },
  { code: 'en_AU', name: 'Australia (English)' },
  { code: 'ja', name: 'Japan (日本語)' },
  { code: 'pt_BR', name: 'Brazil (Português)' },
  { code: 'it', name: 'Italy (Italiano)' },
  { code: 'es', name: 'Spain (Español)' },
];

export const FIELD_CATEGORIES: { name: string; icon: string; types: FieldType[] }[] = [
  {
    name: 'Personal & Auth',
    icon: 'person',
    types: ['UUID', 'Email', 'Username', 'Password', 'Phone', 'Avatar URL'],
  },
  {
    name: 'Location & Geography',
    icon: 'place',
    types: ['Country', 'State', 'City', 'Street', 'Address', 'Postal Code', 'Latitude', 'Longitude'],
  },
  {
    name: 'Business & Finance',
    icon: 'business',
    types: ['Company', 'Department', 'Job Title', 'Profession', 'Currency', 'IBAN', 'SWIFT', 'Credit Card', 'CVV', 'Price'],
  },
  {
    name: 'Temporal (Date & Time)',
    icon: 'schedule',
    types: ['Date', 'Time', 'DateTime', 'Timestamp'],
  },
  {
    name: 'Web & Infrastructure',
    icon: 'dns',
    types: ['Color', 'Image URL', 'URL', 'Domain', 'IPv4', 'IPv6', 'MAC Address'],
  },
  {
    name: 'Text & Content',
    icon: 'notes',
    types: ['Lorem', 'Paragraph', 'Sentence', 'HTML', 'Markdown'],
  },
  {
    name: 'Commerce & Industry',
    icon: 'shopping_cart',
    types: ['Vehicle', 'ISBN', 'Product', 'Category'],
  },
  {
    name: 'Basic & Structural',
    icon: 'code',
    types: ['String', 'Number', 'Integer', 'Boolean', 'JSON', 'Enum', 'Array', 'Object', 'Custom Formula'],
  },
];

export const APP_TEMPLATES: GeneratorTemplate[] = [
  {
    name: 'Users & Accounts',
    category: 'Core',
    description: 'A standard user account database including UUIDs, personal details, contact info, and system roles.',
    defaultRecords: 100,
    schema: {
      name: 'Users & Accounts Schema',
      locale: 'en',
      seed: 12345,
      fields: [
        { id: 'u1', name: 'id', description: 'Unique user identifier', type: 'UUID', required: true, nullable: false, unique: true, properties: {} },
        { id: 'u2', name: 'username', description: 'Unique handle', type: 'Username', required: true, nullable: false, unique: true, properties: {} },
        { id: 'u3', name: 'email', description: 'Primary contact email', type: 'Email', required: true, nullable: false, unique: true, properties: {} },
        { id: 'u4', name: 'password', description: 'Secure password hash simulation', type: 'Password', required: true, nullable: false, unique: false, properties: { minLength: 12, maxLength: 20 } },
        { id: 'u5', name: 'avatar', description: 'User avatar image URL', type: 'Avatar URL', required: false, nullable: true, unique: false, properties: { nullPercentage: 10 } },
        { id: 'u6', name: 'role', description: 'System accessibility role', type: 'Enum', required: true, nullable: false, unique: false, properties: { enumValues: ['admin', 'manager', 'editor', 'user'] } },
        { id: 'u7', name: 'isActive', description: 'Account status state', type: 'Boolean', required: true, nullable: false, unique: false, properties: { probability: 0.85 } },
        { id: 'u8', name: 'createdAt', description: 'System registration time', type: 'DateTime', required: true, nullable: false, unique: false, properties: {} },
      ],
      relationships: [],
    },
  },
  {
    name: 'E-Commerce Retail Orders',
    category: 'Sales',
    description: 'Transaction ledger featuring product pricing, dynamic customer keys, tracking categories, and postal coordinates.',
    defaultRecords: 200,
    schema: {
      name: 'E-Commerce Retail Orders Schema',
      locale: 'en',
      seed: 42,
      fields: [
        { id: 'o1', name: 'orderId', description: 'Unique Order Key', type: 'UUID', required: true, nullable: false, unique: true, properties: {} },
        { id: 'o2', name: 'customerId', description: 'Foreign reference to User ID', type: 'UUID', required: true, nullable: false, unique: false, properties: {} },
        { id: 'o3', name: 'productCategory', description: 'Product category type', type: 'Category', required: true, nullable: false, unique: false, properties: {} },
        { id: 'o4', name: 'productName', description: 'Display name of product', type: 'Product', required: true, nullable: false, unique: false, properties: {} },
        { id: 'o5', name: 'unitPrice', description: 'Calculated retail price', type: 'Price', required: true, nullable: false, unique: false, properties: { min: 5, max: 499 } },
        { id: 'o6', name: 'quantity', description: 'Purchase quantity units', type: 'Integer', required: true, nullable: false, unique: false, properties: { min: 1, max: 5 } },
        { id: 'o7', name: 'totalPrice', description: 'Derived total order cost', type: 'Custom Formula', required: true, nullable: false, unique: false, properties: { customExpression: 'unitPrice * quantity' } },
        { id: 'o8', name: 'shippingZip', description: 'Fulfillment postal route', type: 'Postal Code', required: true, nullable: false, unique: false, properties: {} },
        { id: 'o9', name: 'orderStatus', description: 'Order life-cycle state', type: 'Enum', required: true, nullable: false, unique: false, properties: { enumValues: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] } },
      ],
      relationships: [],
    },
  },
  {
    name: 'IoT Device Metrics',
    category: 'Telemetry',
    description: 'High-frequency telemetry logging simulation with simulated network coordinates, device status and signal noise.',
    defaultRecords: 500,
    schema: {
      name: 'IoT Device Metrics Schema',
      locale: 'en',
      seed: 999,
      fields: [
        { id: 'd1', name: 'deviceId', description: 'Hardware unique ID', type: 'UUID', required: true, nullable: false, unique: false, properties: {} },
        { id: 'd2', name: 'macAddress', description: 'Device network identifier', type: 'MAC Address', required: true, nullable: false, unique: true, properties: {} },
        { id: 'd3', name: 'ipv4', description: 'Assigned gateway address', type: 'IPv4', required: true, nullable: false, unique: false, properties: {} },
        { id: 'd4', name: 'latitude', description: 'Stationary location latitude', type: 'Latitude', required: true, nullable: false, unique: false, properties: {} },
        { id: 'd5', name: 'longitude', description: 'Stationary location longitude', type: 'Longitude', required: true, nullable: false, unique: false, properties: {} },
        { id: 'd6', name: 'temperatureCelsius', description: 'Thermocouple telemetry sensor readings', type: 'Number', required: true, nullable: false, unique: false, properties: { min: 15, max: 45, distributionType: 'Normal', normalMean: 22, normalStdDev: 4 } },
        { id: 'd7', name: 'signalStrengthDb', description: 'Wireless connection quality log', type: 'Integer', required: true, nullable: false, unique: false, properties: { min: -90, max: -30 } },
        { id: 'd8', name: 'timestamp', description: 'Event capture timestamp', type: 'Timestamp', required: true, nullable: false, unique: false, properties: {} },
      ],
      relationships: [],
    },
  },
];

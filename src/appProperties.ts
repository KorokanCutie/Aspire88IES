/**
 * Aspire88 Estates Corporation Integrated Enterprise System - Application Properties Configuration
 * 
 * Centralized settings file to toggle Sandbox Quick Testing Accounts,
 * environment modes (production/sandbox), and database connection profiles.
 */

export interface AppPropertiesType {
  // Toggle the Quick Testing Accounts Sandbox selector on the Login Page
  enableQuickTestingAccounts: boolean;

  // Environment Mode: 'production' | 'sandbox'
  mode: 'production' | 'sandbox';

  // Toggle between Production Database (Supabase) and Test Database (offline local sandbox)
  useTestDatabase: boolean;

  // Optional test database credentials
  testDatabaseConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

// Default property values - MODIFY THESE DIRECTLY TO CHANGE THE APPLICATION BEHAVIOR
const DEFAULT_PROPERTIES: AppPropertiesType = {
  // 1. Toggle sandbox quick-testing accounts at the bottom of the login screen
  enableQuickTestingAccounts: false, // Set to false for pure production

  // 2. Environment Mode: 'production' | 'sandbox'
  mode: 'sandbox',

  // 3. Database Selection: false (Live Supabase Production DB) | true (Test DB / Offline Sandbox)
  useTestDatabase: true, 
  testDatabaseConfig: {
    supabaseUrl: 'https://wfahmglysivxwxdflvoj.supabase.co',
    supabaseAnonKey: 'sb_publishable_lbh5dxjXNnpfaA69SjoOnQ_0czrHOyT',
  }
};

// Load active properties - utilizing DEFAULT_PROPERTIES as the single source of truth.
const loadProperties = (): AppPropertiesType => {
  return DEFAULT_PROPERTIES;
};

// Export active properties loaded from configuration file or runtime overrides
export const AppProperties: AppPropertiesType = { ...loadProperties() };

// Helper to update properties at runtime and persist them
export const updateAppProperties = (updates: Partial<AppPropertiesType>) => {
  try {
    const current = loadProperties();
    const updated = { ...current, ...updates };
    localStorage.setItem('aspire88_properties_config', JSON.stringify(updated));
    
    // Update the live exported reference fields
    AppProperties.enableQuickTestingAccounts = updated.enableQuickTestingAccounts;
    AppProperties.mode = updated.mode;
    AppProperties.useTestDatabase = updated.useTestDatabase;
    AppProperties.testDatabaseConfig = updated.testDatabaseConfig;

    // Dispatch a custom event to notify React components to re-render
    window.dispatchEvent(new Event('app-properties-changed'));
  } catch (e) {
    console.error('Failed to save updated properties to localStorage:', e);
  }
};

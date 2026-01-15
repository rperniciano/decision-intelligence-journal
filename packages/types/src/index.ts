/**
 * @decisions/types
 *
 * Shared TypeScript types for the Decisions application.
 * This package provides type definitions used by both frontend and backend.
 */

/**
 * Base user interface
 */
export interface User {
  id: string;
  email: string;
}

/**
 * User profile with additional metadata
 */
export interface UserProfile extends User {
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Re-export types from enums module
export * from './enums';

// Re-export types from database module for convenience
export * from './database';

// Re-export types from decision module
export * from './decision';

// Re-export types from decision-option module
export * from './decision-option';

// Re-export types from option-pro-con module
export * from './option-pro-con';

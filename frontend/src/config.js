/**
 * Global Application Configuration
 * 
 * Uses Vite environment variables for cross-environment compatibility.
 * VITE_API_BASE_URL can be set in .env files:
 * - Local Dev: /api (proxied via vite.config.js)
 * - Staging/Prod: https://api.storepulse.ai/v1
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  TRIAGE_STREAM: `${API_BASE_URL}/triage/stream`,
  CONFIRM: `${API_BASE_URL}/confirm`,
};

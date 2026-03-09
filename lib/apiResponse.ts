/**
 * Standardized API response helpers.
 * Use these in all API routes for consistent error/success shapes.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Success responses
// ---------------------------------------------------------------------------

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

// ---------------------------------------------------------------------------
// Error responses
// ---------------------------------------------------------------------------

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ---------------------------------------------------------------------------
// Catch-block helper
// ---------------------------------------------------------------------------

/**
 * Logs an error and returns a 500 response.
 * Use in the catch block of every API route handler.
 *
 * @example
 * } catch (error) {
 *   return handleApiError("terminations GET", error);
 * }
 */
export function handleApiError(context: string, error: unknown) {
  console.error(`[${context}] error:`, error);
  return serverError();
}

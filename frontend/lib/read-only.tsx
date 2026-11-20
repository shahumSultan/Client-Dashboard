"use client";
import { createContext, useContext } from "react";

/**
 * True inside the admin panel for an employee, who reads the company pages
 * but cannot change them.
 *
 * The API refuses those writes regardless; this only makes the UI say so up
 * front - controls render disabled instead of failing on click. The base form
 * controls read it themselves, so a new screen built from them is view-only
 * for employees without anyone remembering to wire it.
 */
const ReadOnlyContext = createContext(false);

export const ReadOnlyProvider = ReadOnlyContext.Provider;

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}

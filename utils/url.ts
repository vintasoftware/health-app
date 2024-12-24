/**
 * QueryTypes defines the different ways to specify FHIR search parameters.
 *
 * Can be any valid input to the URLSearchParams() constructor.
 *
 * TypeScript definitions for URLSearchParams do not match runtime behavior.
 * The official spec only accepts string values.
 * Web browsers and Node.js automatically coerce values to strings.
 * See: https://github.com/microsoft/TypeScript/issues/32951
 */
export type QueryTypes =
  | URLSearchParams
  | string[][]
  | Record<string, string | number | boolean | undefined>
  | string
  | undefined;

/**
 * Converts the given `query` to a string.
 *
 * @param query - The query to convert. The type can be any member of `QueryTypes`.
 * @returns The query as a string.
 */
export function getQueryString(query: QueryTypes): string {
  if (typeof query === "object" && !Array.isArray(query) && !(query instanceof URLSearchParams)) {
    query = Object.fromEntries(Object.entries(query).filter((entry) => entry[1] !== undefined));
  }
  // @ts-expect-error Technically `Record<string, string, number, boolean>` is not valid to pass into `URLSearchParams` constructor since `boolean` and `number`
  // are not considered to be valid values based on the WebIDL definition from WhatWG. The current runtime behavior relies on implementation-specific coercion to string under the hood.
  // Source: https://url.spec.whatwg.org/#dom-urlsearchparams-urlsearchparams:~:text=6.2.%20URLSearchParams,)%20init%20%3D%20%22%22)%3B
  return new URLSearchParams(query).toString();
}

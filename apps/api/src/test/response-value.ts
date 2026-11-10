// Supertest exposes an untyped JSON body. Keep assertions on unknown values.
export function responseValue(response: { body: unknown }, path: string): unknown {
  let value: unknown = response.body;
  for (const key of path.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

export type Reply<T> = { status: number; body: T };

export function json<T>({ status, body }: Reply<T>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Last-resort answer: log the message only, never a stack or a request body.
export function serverError(fn: string, err: unknown): Response {
  console.error(`${fn}: ${err instanceof Error ? err.message : String(err)}`);
  return json({ status: 500, body: { error: 'server' } });
}

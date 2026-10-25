import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestPuzzle } from '../src/generator-client.ts';

test('worker requests settle once and release workers, abort listeners and timeout resources', async () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const priorWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  const priorClear = globalThis.clearTimeout;
  let timeout: () => void = () => {};
  let cleared = 0;
  class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    terminated = false;
    request: unknown;
    constructor(public url: URL, public options: unknown) { FakeWorker.instances.push(this); }
    postMessage(value: unknown) { this.request = value; }
    terminate() { this.terminated = true; }
    respond(data: unknown) { this.onmessage?.({ data }); }
  }
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout: (callback: () => void) => { timeout = callback; return 123; } } });
  globalThis.clearTimeout = (() => { cleared++; }) as typeof clearTimeout;
  try {
    const beforeAbort = new AbortController();
    beforeAbort.abort();
    await assert.rejects(requestPuzzle('easy', [], beforeAbort.signal), { name: 'AbortError' });
    assert.equal(FakeWorker.instances.length, 0);

    const abort = new AbortController();
    const promise = requestPuzzle('expert', ['x'], abort.signal);
    const active = FakeWorker.instances.at(-1)!;
    assert.deepEqual(active.request, { id: 1, difficulty: 'expert', excludeFingerprints: ['x'] });
    assert.ok(active.url.pathname.endsWith('generator.worker.ts'));
    const rejection = assert.rejects(promise, { name: 'AbortError' });
    abort.abort();
    await rejection;
    assert.equal(active.terminated, true);

    const timed = requestPuzzle('hard', [], new AbortController().signal);
    const timeoutFailure = assert.rejects(timed, /생성 시간이 길어지고/);
    timeout();
    await timeoutFailure;
    assert.equal(FakeWorker.instances.at(-1)!.terminated, true);

    const failed = requestPuzzle('medium', [], new AbortController().signal);
    FakeWorker.instances.at(-1)!.respond({ id: 1, puzzle: null });
    await assert.rejects(failed, /검증을 통과한 문제/);
    assert.equal(FakeWorker.instances.at(-1)!.terminated, true);

    const crashed = requestPuzzle('easy', [], new AbortController().signal);
    FakeWorker.instances.at(-1)!.onerror?.();
    await assert.rejects(crashed, /생성기를 실행하지 못했어요/);
    assert.equal(FakeWorker.instances.at(-1)!.terminated, true);

    const successController = new AbortController();
    const success = requestPuzzle('easy', [], successController.signal);
    const worker = FakeWorker.instances.at(-1)!;
    worker.respond({ id: 2, puzzle: { id: 'wrong-request' } });
    assert.equal(worker.terminated, false);
    worker.respond({ id: 1, puzzle: { id: 'expected' } });
    assert.deepEqual(await success, { id: 'expected' });
    assert.equal(worker.terminated, true);
    const clearedBeforeLateAbort = cleared;
    successController.abort();
    assert.equal(cleared, clearedBeforeLateAbort, 'settlement removes the abort listener');
    assert.equal(cleared, 5);
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (priorWorker) Object.defineProperty(globalThis, 'Worker', priorWorker); else Reflect.deleteProperty(globalThis, 'Worker');
    globalThis.clearTimeout = priorClear;
  }
});

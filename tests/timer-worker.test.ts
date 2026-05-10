/**
 * Integration-style tests for the timer Web Worker.
 *
 * We mock the Worker globals (self, performance, setInterval, clearInterval)
 * via vi.stubGlobal BEFORE dynamically importing the worker module. This lets us
 * test the actual worker message handler without modifying any source files.
 *
 * The fake clock (fakeTime) is driven manually – each test advances time and
 * fires the captured onTick callback to simulate setInterval beats.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const postMessage = vi.fn()
let fakeTime = 0
let tickHandler: (() => void) | null = null

function makeSteps(durations: number[]) {
  return durations.map((d, i) => ({
    id: `step-${i}`,
    label: `Step ${i}`,
    durationMs: d,
    notes: '',
  }))
}

function send(type: string, extra: Record<string, unknown> = {}) {
  const handler = (self as any).onmessage
  handler({ data: { type, ...extra } })
}

function advanceTime(ms: number) {
  fakeTime += ms
}

function tick() {
  tickHandler?.()
}

beforeAll(async () => {
  vi.stubGlobal('self', { postMessage } as any)
  vi.stubGlobal('performance', { now: () => fakeTime })
  vi.stubGlobal(
    'setInterval',
    vi.fn((cb: () => void, _ms: number) => {
      tickHandler = cb
      return 42
    }) as any,
  )
  vi.stubGlobal('clearInterval', vi.fn())

  // Dynamic import AFTER mocks — the worker's top-level code assigns
  // self.onmessage using our mock globals.
  await import('../src/services/timer-worker')
})

beforeEach(() => {
  fakeTime = 0
  tickHandler = null
  postMessage.mockClear()
  send('stop') // reset module-level worker state between tests
  postMessage.mockClear()
})

describe('Timer Worker', () => {
  it('completes a single step', () => {
    send('start', { steps: makeSteps([1000]) })

    advanceTime(1000)
    tick()

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 0 }),
    )
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'procedureComplete' }),
    )
  })

  it('auto-advances through a multi-step procedure', () => {
    send('start', { steps: makeSteps([500, 500, 500]) })

    advanceTime(500)
    tick()
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 0 }),
    )
    postMessage.mockClear()

    advanceTime(500)
    tick()
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 1 }),
    )
    postMessage.mockClear()

    advanceTime(500)
    tick()

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 2 }),
    )
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'procedureComplete' }),
    )
  })

  it('pause and resume preserves remaining time', () => {
    send('start', { steps: makeSteps([5000]) })

    advanceTime(1000)
    tick()

    postMessage.mockClear()

    send('pause')
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'paused' }),
    )
    const pauseCall = postMessage.mock.calls.find(
      (c) => c[0]?.type === 'paused',
    )
    expect(pauseCall).toBeDefined()
    const remainingAtPause: number = pauseCall![0].remainingMs
    expect(remainingAtPause).toBeGreaterThan(3900)
    expect(remainingAtPause).toBeLessThanOrEqual(4000)

    postMessage.mockClear()

    advanceTime(2000)

    send('resume')
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resumed' }),
    )

    postMessage.mockClear()

    advanceTime(remainingAtPause)
    tick()

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 0 }),
    )
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'procedureComplete' }),
    )
  })

  it('rapid pause/resume does not break the timer', () => {
    send('start', { steps: makeSteps([1000]) })

    for (let i = 0; i < 5; i++) {
      advanceTime(10)
      send('pause')
      advanceTime(10)
      send('resume')
    }

    postMessage.mockClear()

    advanceTime(2000)
    tick()

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete' }),
    )
  })

  it('stop during step terminates the procedure', () => {
    send('start', { steps: makeSteps([5000]) })
    postMessage.mockClear()

    advanceTime(500)
    tick()
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tick' }),
    )

    postMessage.mockClear()

    send('stop')

    advanceTime(10_000)
    tick()

    expect(postMessage).not.toHaveBeenCalled()
  })

  it('zero-duration steps are skipped', () => {
    send('start', { steps: makeSteps([0, 1000, 0]) })

    expect(
      postMessage.mock.calls.filter((c) => c[0].type === 'stepComplete'),
    ).toHaveLength(0)

    advanceTime(1000)
    tick()

    const stepIndexes: number[] = postMessage.mock.calls
      .filter((c) => c[0].type === 'stepComplete')
      .map((c) => c[0].stepIndex)

    expect(stepIndexes).toContain(1)
    expect(stepIndexes).toContain(2)

    const types = postMessage.mock.calls.map((c) => c[0].type)
    expect(types).toContain('procedureComplete')
  })

  it('skipTo advances to the specified step', () => {
    send('start', { steps: makeSteps([5000, 5000, 5000]) })

    send('skipTo', { stepIndex: 2 })
    postMessage.mockClear()

    advanceTime(5000)
    tick()

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stepComplete', stepIndex: 2 }),
    )
    expect(postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'procedureComplete' }),
    )
  })
})

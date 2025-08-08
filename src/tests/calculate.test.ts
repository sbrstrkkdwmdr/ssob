import { timeToMs } from "../tools/calculate";

test('s', async () => {
    const arg = '2s';
    const out = timeToMs(arg);
    expect(out).toBe(2000);
});

test('m', async () => {
    const arg = '45m';
    const out = timeToMs(arg);
    expect(out).toBe(45 * 60 * 1000);
});

test('h', async () => {
    const arg = '23h';
    const out = timeToMs(arg);
    expect(out).toBe(23 * 60 * 60 * 1000);
});

test('d', async () => {
    const arg = '4d';
    const out = timeToMs(arg);
    expect(out).toBe(4 * 24 * 60 * 60 * 1000);
});

test('dhms', async () => {
    const arg = '1d23h45m2s';
    const out = timeToMs(arg);
    expect(out).toBe(24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 45 * 60 * 1000 + 2000);
});

test('timer', async () => {
    const arg = '23:23';
    const out = timeToMs(arg);
    expect(out).toBe(23 * 60 * 60 * 1000 + 23 * 60 * 1000);
});

test('timer2', async () => {
    const arg = '23:59:59';
    const out = timeToMs(arg);
    expect(out).toBe(23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000);
});
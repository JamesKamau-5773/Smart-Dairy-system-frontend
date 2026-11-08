import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Confirmation, { matchesConfirmText, useConfirmation } from '../Confirmation';

afterEach(cleanup);

const base = { isOpen: true, title: 'Delete Neema?', message: 'Neema · KE-012', confirmText: 'Delete', cancelText: 'Keep', type: 'danger' };

describe('Confirmation', () => {
  it('confirms straight away when no typing is required', () => {
    const onConfirm = vi.fn();
    render(<Confirmation {...base} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('keeps Delete disabled until the required text is typed (type-to-confirm)', () => {
    const onConfirm = vi.fn();
    render(<Confirmation {...base} requireText="KE-012" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const confirm = screen.getByRole('button', { name: 'Delete' });
    const input = screen.getByLabelText(/Type KE-012 to confirm/);

    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'KE-01' } });
    expect(confirm.disabled).toBe(true);
    fireEvent.submit(input.closest('form'));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: ' ke-012 ' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels on Escape', () => {
    const onCancel = vi.fn();
    render(<Confirmation {...base} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not cancel on Escape while the action is running', () => {
    const onCancel = vi.fn();
    render(<Confirmation {...base} isLoading onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('matchesConfirmText', () => {
  it.each([
    ['Wanjiku’s Kiosk', "wanjiku's kiosk", true],
    ['Wanjiku Kiosk', 'Wanjiku   Kiosk', true],
    ['KE-012', 'KE-012 ', true],
    ['KE-012', 'KE-013', false],
    ['', '', false],
  ])('%s vs %s → %s', (expected, typed, result) => {
    expect(matchesConfirmText(typed, expected)).toBe(result);
  });
});

describe('useConfirmation', () => {
  it('starts every dialog from the defaults, so one dialog’s typing rule never leaks into the next', async () => {
    const { result } = renderHook(() => useConfirmation());
    act(() => { result.current.confirm({ title: 'Delete cow?', requireText: 'KE-012' }); });
    expect(result.current.requireText).toBe('KE-012');
    act(() => { result.current.onCancel(); });

    act(() => { result.current.confirm({ title: 'Sign out?' }); });
    expect(result.current.requireText).toBe('');
    expect(result.current.title).toBe('Sign out?');
  });

  it('resolves true on confirm and false on cancel', async () => {
    const { result } = renderHook(() => useConfirmation());
    let answer;
    act(() => { result.current.confirm({ title: 'A' }).then((value) => { answer = value; }); });
    await act(async () => { result.current.onConfirm(); });
    expect(answer).toBe(true);
    expect(result.current.isOpen).toBe(false);

    act(() => { result.current.confirm({ title: 'B' }).then((value) => { answer = value; }); });
    await act(async () => { result.current.onCancel(); });
    expect(answer).toBe(false);
  });
});

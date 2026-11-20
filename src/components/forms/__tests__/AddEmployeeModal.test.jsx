import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AddEmployeeModal from '../AddEmployeeModal';

void React;

describe('AddEmployeeModal', () => {
  it('renders in a viewport portal with every employment field visible', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    render(<AddEmployeeModal isOpen onClose={vi.fn()} onSave={vi.fn()} />, { container: host });

    const dialog = screen.getByRole('dialog', { name: 'Add employee' });
    // BaseModal: the dialog sits in a full-screen overlay portalled to <body>.
    const overlay = dialog.parentElement;
    expect(overlay.parentElement).toBe(document.body);
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');

    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByLabelText(/job role/i)).toBeTruthy();
    expect(screen.getByLabelText(/phone number/i)).toBeTruthy();
    expect(screen.getByLabelText(/base salary/i)).toBeTruthy();
    expect(screen.getByLabelText(/hire date/i)).toBeTruthy();
    expect(screen.getByRole('tab', { name: /no access/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /send invitation/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /provision directly/i })).toBeTruthy();
  });
});
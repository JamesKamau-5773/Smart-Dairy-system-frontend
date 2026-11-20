import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SelectField, TextAreaField, TextField } from '../FormField';
import { FIELD_CONTROL, FIELD_LABEL } from '../formFieldStyles';

afterEach(cleanup);

describe('shared form fields', () => {
  it('labels the control and gives it the standard look', () => {
    render(<TextField id="cow-name" label="Cow name" defaultValue="Malkia" />);
    const input = screen.getByLabelText('Cow name');
    expect(input.className).toContain(FIELD_CONTROL);
    expect(screen.getByText('Cow name').className).toBe(FIELD_LABEL);
  });

  it('announces the hint and the error with the control, and marks it invalid', () => {
    render(<TextField id="litres" label="Litres" hint="Morning milking only" error="Enter the litres." />);
    const input = screen.getByLabelText('Litres');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('litres-error litres-hint');
    expect(input.className).toContain('border-danger');
    expect(screen.getByText('Enter the litres.').id).toBe('litres-error');
  });

  it('has no aria-describedby or invalid flag when there is nothing to describe', () => {
    render(<TextField id="plain" label="Plain" />);
    const input = screen.getByLabelText('Plain');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('gives selects and text boxes the same look', () => {
    render(
      <>
        <SelectField id="unit" label="Unit" defaultValue="kg"><option value="kg">kg</option></SelectField>
        <TextAreaField id="notes" label="Notes" />
      </>
    );
    expect(screen.getByLabelText('Unit').className).toContain(FIELD_CONTROL);
    expect(screen.getByLabelText('Notes').className).toContain(FIELD_CONTROL);
    expect(screen.getByLabelText('Notes').getAttribute('rows')).toBe('3');
  });
});

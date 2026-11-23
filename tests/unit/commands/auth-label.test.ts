import { withLabel } from '../../../src/utils/labels.js';

describe('withLabel', () => {
  it('adds the label once', () => {
    expect(withLabel('Registration failed', 'Invalid username')).toBe('\n✗ Registration failed: Invalid username');
  });
  it('does not repeat a label the server message already starts with', () => {
    expect(withLabel('Registration failed', 'Registration failed. Please try a different email or log in.'))
      .toBe('\n✗ Registration failed. Please try a different email or log in.');
  });
});

/** "✗ <label>: <message>", without repeating the label when the server's message already starts with it. */
export function withLabel(label: string, message: string): string {
  return message.toLowerCase().startsWith(label.toLowerCase()) ? `\n✗ ${message}` : `\n✗ ${label}: ${message}`;
}

const WAT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const WAT_DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatWAT(timestamp: string): string {
  return WAT_FORMATTER.format(new Date(timestamp));
}

export function formatWATDateTime(timestamp: string): string {
  return WAT_DATETIME_FORMATTER.format(new Date(timestamp));
}

export function formatDate(date: Date): string {
  return date.toISOString()
}

export function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
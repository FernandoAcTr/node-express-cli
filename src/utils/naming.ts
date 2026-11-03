function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0)
}

/** `user_profile`, `user-profile`, `UserProfile` -> `UserProfile` */
export function pascalCase(input: string): string {
  return splitWords(input)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

/** `UserProfile`, `user_profile` -> `userProfile` */
export function camelCase(input: string): string {
  const pascal = pascalCase(input)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/** `UserProfile`, `user profile` -> `user-profile` */
export function kebabCase(input: string): string {
  return splitWords(input)
    .map((word) => word.toLowerCase())
    .join('-')
}

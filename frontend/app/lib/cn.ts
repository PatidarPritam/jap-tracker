/**
 * Tiny classname combiner — joins truthy class strings with a space.
 * Keeps component variant maps readable without pulling in a dependency.
 * Consumer-provided className is always appended last so it wins.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

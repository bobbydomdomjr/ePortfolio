import { toRaw } from 'vue'

export function cloneContent(content) {
  return structuredClone(toRaw(content))
}

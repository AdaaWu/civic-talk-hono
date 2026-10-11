declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare const __CIVIC_SOURCE__: import('./source').SourceMetadata

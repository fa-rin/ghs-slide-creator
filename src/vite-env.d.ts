/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HYMN_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

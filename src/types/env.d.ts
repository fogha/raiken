declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
      LANGCHAIN_TRACING_V2?: string;
      LANGCHAIN_API_KEY?: string;
      LANGCHAIN_PROJECT?: string;
    }
  }
}

export {}; 
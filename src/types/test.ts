export type TestAction = 
  | { type: 'click'; selector: string }
  | { type: 'type'; selector: string; value: string }
  | { type: 'assert'; selector: string; assertion: 'exists' | 'notExists' | 'hasText' | 'hasValue' }
  | { type: 'wait'; duration: number }
  | { type: 'hover'; selector: string }
  | { type: 'press'; key: string };

export interface TestStep {
  id: string;
  action: TestAction;
  description: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  cases: TestCase[];
}

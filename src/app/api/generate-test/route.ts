import { TestGenerator } from '@/lib/test-generation';

const generator = new TestGenerator();

export async function POST(req: Request) {
  const { description } = await req.json();

  try {
    const result = await generator.generatePlaywrightScript(description);
    return Response.json(result);
  } catch (error) {
    console.error('Test generation error:', error);
    return Response.json({ error: 'Failed to generate test script' }, { status: 500 });
  }
} 
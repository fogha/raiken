// Only export client-safe utilities - DO NOT export playwright.service here
// as it causes NextJS to try to bundle Playwright for the browser
// Note: PlaywrightBrowser functionality has been moved to /app/tests/page.tsx
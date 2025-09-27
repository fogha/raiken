import TestsPage from './TestWrapper';

export default function TestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TestsPage>
      {children}
    </TestsPage>
  );
}
import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with iframe manipulation
const ProjectViewer = dynamic(
  () => import('../components/ProjectViewer'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen">
      <ProjectViewer />
    </main>
  );
}

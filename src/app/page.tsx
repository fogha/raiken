import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the tests page
  redirect('/tests/editor');
}

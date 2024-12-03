import { pages } from "./_components/Notion";

export default function Home() {
  const PageLeeRobinson = pages.PageLeeRobinson;
  return (
    <main className="prose prose-invert m-auto py-20 prose-h3:font-normal prose-table:[word-break:break-word]">
      <PageLeeRobinson />
    </main>
  );
}

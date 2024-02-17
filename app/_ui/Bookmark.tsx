import { JSDOM } from "jsdom";

export default async function Bookmark({ url }: { url: string }) {
  const response = await fetch(url);
  const html = await response.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const ogTags: Record<string, string | undefined> = {};
  const metaTags = document.querySelectorAll('meta[property^="og:"]');

  metaTags.forEach((meta) => {
    const property = meta.getAttribute("property");
    const content = meta.getAttribute("content");
    if (property && content) {
      ogTags[property.replace("og:", "")] = content;
    }
  });

  const { title, image: imageSrc, description } = ogTags;
  const faviconSrc = `https://${new URL(url).host}/favicon.ico`;
  return (
    <div
      style={{
        border: "solid 1px gray",
        borderRadius: "5px",
        display: "flex",
        margin: "10px 0 10px 0",
      }}
    >
      <div style={{ padding: "10px 15px", flex: "3 1" }}>
        <h4 style={{ margin: 0, fontWeight: "normal" }}>{title}</h4>
        <p style={{ fontSize: "14px", color: "gray", lineClamp: 2 }}>
          {description?.slice(0, 80)}
          {(description?.length || 0) > 40 ? "..." : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={faviconSrc} alt="" style={{ height: "20px", margin: 0 }} />
          <p style={{ fontSize: "12px", margin: "0 10px 0 8px" }}>
            {url.slice(0, 40)}
            {url.length > 40 ? "..." : ""}
          </p>
        </div>
      </div>
      <img
        src={imageSrc}
        style={{
          margin: 0,
          flex: "2 1",
          minWidth: 0,
          maxHeight: "106px",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

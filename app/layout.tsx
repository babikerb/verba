import Stars from "@/components/stars";
import "@/public/styles.css";

export const metadata = {
  title: "Verba",
  description: "Live transcription tool for meetings, lectures, and podcasts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div className="layout-container">
          <Stars />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}

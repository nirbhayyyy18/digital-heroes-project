import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Heroes — Play. Win. Give Back.",
  description:
    "Track your rounds, enter the monthly draw, and turn every game into a contribution to a cause you care about.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink text-cloud antialiased selection:bg-mint selection:text-ink">
        {children}
      </body>
    </html>
  );
}

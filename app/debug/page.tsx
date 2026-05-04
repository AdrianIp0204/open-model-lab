import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debug | Open Model Lab",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DebugPage() {
  return <div>debug route works</div>;
}

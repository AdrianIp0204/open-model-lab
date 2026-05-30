import type { Metadata } from "next";
import DevAccountHarnessPage from "../../../dev/account-harness/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default DevAccountHarnessPage;

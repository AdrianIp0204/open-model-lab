import AssignmentPage, {
  buildAssignmentPageMetadata,
} from "../../../assignments/[id]/page";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

type LocalizedAssignmentPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: LocalizedAssignmentPageProps) {
  const { locale, id } = await params;

  if (!isAppLocale(locale)) {
    return {};
  }

  return buildAssignmentPageMetadata({
    params: Promise.resolve({ id }),
    locale,
  });
}

export default async function LocalizedAssignmentPage({
  params,
}: LocalizedAssignmentPageProps) {
  const { locale, id } = await params;
  const resolvedLocale: AppLocale = isAppLocale(locale) ? locale : "en";

  return (
    <AssignmentPage
      params={Promise.resolve({ id })}
      localeOverride={resolvedLocale}
    />
  );
}

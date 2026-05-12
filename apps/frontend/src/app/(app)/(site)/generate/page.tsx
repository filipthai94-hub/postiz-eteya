export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { GenerateContent } from '@gitroom/frontend/components/generate/generate.content';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Eteya Social Manager' : 'Gitroom'} Generera`,
  description: 'Generera 6 plattform-inlägg från ett ämne via Eteya content-engine',
};

export default async function Index() {
  return <GenerateContent />;
}

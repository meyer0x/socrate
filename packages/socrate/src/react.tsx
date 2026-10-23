import { useDebugValue, useMemo } from 'react';
import { SocrateReview as Review } from '@socrate/react';
import { CLIENT_MARK } from './mark.ts';

/** `import.meta.env.SOCRATE` d'un build de preview ; `origin` absent, le composant ne vérifie pas l'origine de la page. */
export type SocratePreview = { serviceUrl: string; projectId: string; reviewKey: string; deploymentId: string; origin?: string };
export type NavigationAdapter = { current(): string; go(route: string): void };
export type SocrateReviewProps = {
  preview: SocratePreview;
  getIdentityAssertion: (signal: AbortSignal) => Promise<string>;
  navigation: NavigationAdapter;
  editorial?: boolean;
};

// Une page encadrée ou servie depuis une autre origine que celle du build n'obtiendrait aucune session : rien n'est rendu.
function useTopLevelAt(origin: string | undefined): boolean {
  useDebugValue(CLIENT_MARK);
  if (typeof window === 'undefined') return false;
  let framed: boolean;
  try {
    framed = window.self !== window.top;
  } catch {
    framed = true;
  }
  return !framed && (origin === undefined || origin === window.location.origin);
}

export function SocrateReview({ preview, ...props }: SocrateReviewProps) {
  const { serviceUrl, projectId, reviewKey, deploymentId } = preview;
  // Le client interne se recrée à chaque nouvel objet `preview` : seule une valeur différente en crée un.
  const context = useMemo(() => ({ serviceUrl, projectId, reviewKey, deploymentId }), [serviceUrl, projectId, reviewKey, deploymentId]);
  if (!useTopLevelAt(preview.origin)) return null;
  return <Review {...props} preview={context} />;
}

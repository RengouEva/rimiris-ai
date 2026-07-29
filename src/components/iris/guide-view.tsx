'use client'

import * as React from 'react'
import { BookOpen, FileText, ArrowRight, Sparkles, Info, ChevronLeft } from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { GuideUpload } from '@/components/iris/guide-upload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// GuideView — Page indépendante pour gérer le guide méthodologique.
// L'étudiant y importe le PDF de son université, voit le texte extrait,
// et comprend comment IRIS l'utilise pour adapter ses rédactions.
// ============================================================================

export function GuideView() {
  const { project, setView } = useIrisStore()
  const hasGuide = Boolean(project.guideText && project.guideText.trim())

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => setView('workspace')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Retour au mémoire
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-xl iris-gradient flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-none">Guide méthodologique</h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Importez le PDF officiel de votre université. IRIS l'utilise comme
                contexte permanent pour adapter la structure, les normes bibliographiques
                et la formulation à vos exigences locales.
              </p>
            </div>
          </div>
        </div>

        {/* Why it matters */}
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold mb-1">Pourquoi importer un guide ?</p>
                <p className="text-muted-foreground">
                  Chaque établissement a ses propres règles : nombre de pages, structure
                  attendue, style des citations, formulation de la problématique. Sans guide,
                  IRIS utilise les conventions académiques générales. Avec votre guide, IRIS
                  produit un mémoire conforme à <strong>votre</strong> université.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload area — uses the full-variant GuideUpload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {hasGuide ? 'Guide actif' : 'Importer un guide'}
              {hasGuide && (
                <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  Actif
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GuideUpload variant="full" />
          </CardContent>
        </Card>

        {/* How IRIS uses the guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Comment IRIS exploite votre guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 font-bold">1.</span>
                <span>
                  <strong className="text-foreground">Extraction automatique</strong> — le texte
                  du PDF est extrait côté serveur (max 30 000 caractères) et stocké dans votre
                  navigateur. Aucune donnée n'est envoyée ailleurs.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 font-bold">2.</span>
                <span>
                  <strong className="text-foreground">Contexte permanent</strong> — chaque appel
                  IA (rédaction, audit, soutenance, simulation) reçoit un résumé de votre guide
                  avec la mention « RESPECTE SES EXIGENCES ».
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 font-bold">3.</span>
                <span>
                  <strong className="text-foreground">Conformité structurelle</strong> — IRIS
                  adapte le nombre de sections, leur titrage, la formulation de la problématique
                  et le style de citation aux règles détectées dans le guide.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-primary mt-0.5 font-bold">4.</span>
                <span>
                  <strong className="text-foreground">Mise à jour à tout moment</strong> — vous
                  pouvez remplacer ou supprimer le guide. Les prochaines rédactions utiliseront
                  immédiatement la nouvelle version.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA to start writing */}
        {hasGuide && (
          <div className="flex justify-end">
            <Button
              onClick={() => setView('workspace')}
              className="rounded-full iris-gradient text-white"
              size="lg"
            >
              Aller à mon mémoire
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

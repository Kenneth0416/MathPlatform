"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Shield,
  Eye,
  BookOpen,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  FileText,
  Lock,
  Globe,
  GraduationCap,
  Scale,
} from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

export function CompliancePanel() {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  const complianceData = [
    {
      icon: FileText,
      titleKey: "compliance.systemPromptExample",
      descriptionKey: "compliance.complianceRequirements",
      status: "compliant" as const,
      pointKeys: ["compliance.point5", "compliance.point6", "compliance.point7", "compliance.point8"],
      legalBasis: []
    },
    {
      icon: Shield,
      titleKey: "compliance.legalCompliance",
      descriptionKey: "compliance.legalComplianceDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point1", "compliance.point2", "compliance.point3", "compliance.point4"],
      legalBasis: ["compliance.legal1", "compliance.legal2", "compliance.legal3", "compliance.legal4"]
    },
    {
      icon: Eye,
      titleKey: "compliance.transparency",
      descriptionKey: "compliance.transparencyDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point9", "compliance.point10", "compliance.point11", "compliance.point12"],
      legalBasis: ["compliance.legal3"]
    },
    {
      icon: BookOpen,
      titleKey: "compliance.accuracy",
      descriptionKey: "compliance.accuracyDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point13", "compliance.point14", "compliance.point15", "compliance.point16"],
      legalBasis: ["compliance.legal3", "compliance.legal4"]
    },
    {
      icon: Users,
      titleKey: "compliance.fairness",
      descriptionKey: "compliance.fairnessDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point17", "compliance.point18", "compliance.point19", "compliance.point20"],
      legalBasis: ["compliance.legal3"]
    },
    {
      icon: GraduationCap,
      titleKey: "compliance.practicality",
      descriptionKey: "compliance.practicalityDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point21", "compliance.point22", "compliance.point23", "compliance.point24"],
      legalBasis: ["compliance.legal4"]
    },
    {
      icon: Lock,
      titleKey: "compliance.privacy",
      descriptionKey: "compliance.privacyDesc",
      status: "compliant" as const,
      pointKeys: ["compliance.point25", "compliance.point26", "compliance.point27", "compliance.point28"],
      legalBasis: ["compliance.legal1"]
    }
  ]

  const getStatusIcon = (status: "compliant" | "warning" | "info") => {
    switch (status) {
      case "compliant":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = (status: "compliant" | "warning" | "info") => {
    switch (status) {
      case "compliant":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">{t('compliance.compliant')}</Badge>
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{t('compliance.warning')}</Badge>
      case "info":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('compliance.info')}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Scale className="h-4 w-4" />
          <span className="hidden sm:inline">{t('compliance.status')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('compliance.title')}
          </DialogTitle>
          <DialogDescription>
            {t('compliance.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {complianceData.map((item, index) => {
                const Icon = item.icon
                return (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm">{t(item.titleKey)}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {t(item.descriptionKey)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1">
                        {item.pointKeys.map((pointKey, pointIndex) => (
                          <li key={pointIndex} className="flex items-start gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{t(pointKey)}</span>
                          </li>
                        ))}
                        {item.legalBasis.length > 0 && (
                          <>
                            <Separator className="my-2" />
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              {t('compliance.legalBasis')}:
                            </div>
                            {item.legalBasis.map((legalKey, legalIndex) => (
                              <li key={`legal-${legalIndex}`} className="flex items-start gap-2 text-xs">
                                <Globe className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{t(legalKey)}</span>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
import { FeatureType } from "@/features/knowledgebase/types";
import {
    Cpu,
    Fingerprint,
    Pencil,
    Settings2,
    Sparkles,
    Zap,
} from "lucide-react";


export const features: FeatureType[] = [
    {
        title: "Faaast",
        icon: Zap,
        description: "It supports an entire helping developers and innovate.",
    },
    {
        title: "Powerful",
        icon: Cpu,
        description: "It supports an entire helping developers and businesses.",
    },
    {
        title: "Security",
        icon: Fingerprint,
        description: "It supports an helping developers businesses.",
    },
    {
        title: "Customization",
        icon: Pencil,
        description: "It supports helping developers and businesses innovate.",
    },
    {
        title: "Control",
        icon: Settings2,
        description: "It supports helping developers and businesses innovate.",
    },
    {
        title: "Built for AI",
        icon: Sparkles,
        description: "It supports helping developers and businesses innovate.",
    },
];
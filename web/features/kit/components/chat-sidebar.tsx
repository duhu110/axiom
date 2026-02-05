
"use client"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarFooter,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
    BookOpen,
    Bot,
    CirclePlus,
    Frame,
    LifeBuoy,
    Map,
    PieChart,
    Send,
    Settings2,
    SquareTerminal,
} from "lucide-react"
import { NavUser } from "@/features/kit/components/nav-user"
import { LogoIcon } from "@/components/logo"



const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Playground",
            url: "#",
            icon: SquareTerminal,
            isActive: true,
            items: [
                {
                    title: "History",
                    url: "#",
                },
                {
                    title: "Starred",
                    url: "#",
                },
                {
                    title: "Settings",
                    url: "#",
                },
            ],
        },
        {
            title: "Models",
            url: "#",
            icon: Bot,
            items: [
                {
                    title: "Genesis",
                    url: "#",
                },
                {
                    title: "Explorer",
                    url: "#",
                },
                {
                    title: "Quantum",
                    url: "#",
                },
            ],
        },
        {
            title: "Documentation",
            url: "#",
            icon: BookOpen,
            items: [
                {
                    title: "Introduction",
                    url: "#",
                },
                {
                    title: "Get Started",
                    url: "#",
                },
                {
                    title: "Tutorials",
                    url: "#",
                },
                {
                    title: "Changelog",
                    url: "#",
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings2,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Team",
                    url: "#",
                },
                {
                    title: "Billing",
                    url: "#",
                },
                {
                    title: "Limits",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Support",
            url: "#",
            icon: LifeBuoy,
        },
        {
            title: "Feedback",
            url: "#",
            icon: Send,
        },
    ],
    projects: [
        {
            name: "Design Engineering",
            url: "#",
            icon: Frame,
        },
        {
            name: "Sales & Marketing",
            url: "#",
            icon: PieChart,
        },
        {
            name: "Travel",
            url: "#",
            icon: Map,
        },
    ],
}

// Initial conversation history
const conversationHistory = [
    {
        period: "Today",
        conversations: [
            {
                id: "t1",
                title: "Project roadmap discussion",
                lastMessage:
                    "Let's prioritize the authentication features for the next sprint.",
                timestamp: new Date().setHours(new Date().getHours() - 2),
            },
            {
                id: "t2",
                title: "API Documentation Review",
                lastMessage:
                    "The endpoint descriptions need more detail about rate limiting.",
                timestamp: new Date().setHours(new Date().getHours() - 5),
            },
            {
                id: "t3",
                title: "Frontend Bug Analysis",
                lastMessage:
                    "I found the issue - we need to handle the null state in the user profile component.",
                timestamp: new Date().setHours(new Date().getHours() - 8),
            },
            {
                id: "t4",
                title: "Project roadmap discussion",
                lastMessage:
                    "Let's prioritize the authentication features for the next sprint.",
                timestamp: new Date().setHours(new Date().getHours() - 2),
            },
            {
                id: "t5",
                title: "API Documentation Review",
                lastMessage:
                    "The endpoint descriptions need more detail about rate limiting.",
                timestamp: new Date().setHours(new Date().getHours() - 5),
            },
            {
                id: "t6",
                title: "Frontend Bug Analysis",
                lastMessage:
                    "I found the issue - we need to handle the null state in the user profile component.",
                timestamp: new Date().setHours(new Date().getHours() - 8),
            },
        ],
    },
    {
        period: "Yesterday",
        conversations: [
            {
                id: "y1",
                title: "Database Schema Design",
                lastMessage:
                    "Let's add indexes to improve query performance on these tables.",
                timestamp: new Date().setDate(new Date().getDate() - 1),
            },
            {
                id: "y2",
                title: "Performance Optimization",
                lastMessage:
                    "The lazy loading implementation reduced initial load time by 40%.",
                timestamp: new Date().setDate(new Date().getDate() - 1),
            },
        ],
    },
    {
        period: "Last 7 days",
        conversations: [
            {
                id: "w1",
                title: "Authentication Flow",
                lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
                timestamp: new Date().setDate(new Date().getDate() - 3),
            },
            {
                id: "w2",
                title: "Component Library",
                lastMessage:
                    "These new UI components follow the design system guidelines perfectly.",
                timestamp: new Date().setDate(new Date().getDate() - 5),
            },
            {
                id: "w3",
                title: "UI/UX Feedback",
                lastMessage:
                    "The navigation redesign received positive feedback from the test group.",
                timestamp: new Date().setDate(new Date().getDate() - 6),
            },
            {
                id: "w4",
                title: "Authentication Flow",
                lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
                timestamp: new Date().setDate(new Date().getDate() - 3),
            },
            {
                id: "w5",
                title: "Component Library",
                lastMessage:
                    "These new UI components follow the design system guidelines perfectly.",
                timestamp: new Date().setDate(new Date().getDate() - 5),
            },
            {
                id: "w6",
                title: "UI/UX Feedback",
                lastMessage:
                    "The navigation redesign received positive feedback from the test group.",
                timestamp: new Date().setDate(new Date().getDate() - 6),
            },
            {
                id: "w7",
                title: "Authentication Flow",
                lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
                timestamp: new Date().setDate(new Date().getDate() - 3),
            },
            {
                id: "w8",
                title: "Component Library",
                lastMessage:
                    "These new UI components follow the design system guidelines perfectly.",
                timestamp: new Date().setDate(new Date().getDate() - 5),
            },
            {
                id: "w9",
                title: "UI/UX Feedback",
                lastMessage:
                    "The navigation redesign received positive feedback from the test group.",
                timestamp: new Date().setDate(new Date().getDate() - 6),
            },
            {
                id: "w10",
                title: "Authentication Flow",
                lastMessage: "We should implement the OAuth2 flow with refresh tokens.",
                timestamp: new Date().setDate(new Date().getDate() - 3),
            },
            {
                id: "w11",
                title: "Component Library",
                lastMessage:
                    "These new UI components follow the design system guidelines perfectly.",
                timestamp: new Date().setDate(new Date().getDate() - 5),
            },
            {
                id: "w12",
                title: "UI/UX Feedback",
                lastMessage:
                    "The navigation redesign received positive feedback from the test group.",
                timestamp: new Date().setDate(new Date().getDate() - 6),
            },
        ],
    },
    {
        period: "Last month",
        conversations: [
            {
                id: "m1",
                title: "Initial Project Setup",
                lastMessage:
                    "All the development environments are now configured consistently.",
                timestamp: new Date().setDate(new Date().getDate() - 15),
            },
        ],
    },
]



export function ChatSidebar() {
    return (
        <Sidebar variant="floating">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <LogoIcon className="size-5" />
                                <span className="text-base font-semibold">Axiom</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            tooltip="Quick Create"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                        >
                            <CirclePlus />
                            <span>Quick Create</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className="pt-4">
                {conversationHistory.map((group) => (
                    <SidebarGroup key={group.period}>
                        <SidebarGroupLabel>{group.period}</SidebarGroupLabel>
                        <SidebarMenu>
                            {group.conversations.map((conversation) => (
                                <SidebarMenuButton key={conversation.id}>
                                    <span>{conversation.title}</span>
                                </SidebarMenuButton>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
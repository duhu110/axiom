"use client";
import { useScroll } from "@/hooks/use-scroll";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/features/bot/components/mobile-nav";
import { ModeToggle } from "@/components/mode-toggle";
import type { HeaderProps, NavLink } from "@/features/bot/types";

export const navLinks: NavLink[] = [
	{
		label: "知识库",
		href: "#",
	},
	{
		label: "Pricing",
		href: "#",
	},
	{
		label: "About",
		href: "#",
	},
];

export function Header({ leading }: HeaderProps) {
	const scrolled = useScroll(10);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 mx-auto w-full max-w-5xl border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out",
				{
					"border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-3xl md:shadow":
						scrolled,
				}
			)}
		>
			<nav
				className={cn(
					"flex h-16 w-full items-center justify-between px-6 md:h-14 md:transition-all md:ease-out",
					{
						"md:px-2": scrolled,
					}
				)}
			>
				<div className="flex items-center gap-4">
					{leading}
					<a className="rounded-md p-2 hover:bg-accent" href="#">
						<Logo className="h-7" />
					</a>
				</div>
				<div className="flex items-center gap-2">
					<div className="hidden items-center gap-1 md:flex">
						{navLinks.map((link, i) => (
							<a
								className={cn(
									buttonVariants({ variant: "ghost" }),
									"text-base font-medium"
								)}
								href={link.href}
								key={i}
							>
								{link.label}
							</a>
						))}
					</div>
					<div className="flex items-center border-l pl-4 gap-2"> {/* 增加分割线感 */}
						<ModeToggle />
						<MobileNav />
					</div>
				</div>
			</nav>
		</header>
	);
}

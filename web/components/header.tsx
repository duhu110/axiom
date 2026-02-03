"use client";
import { useScroll } from "@/hooks/use-scroll";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/mobile-nav";
import { ModeToggle } from "@/components/mode-toggle";

export const navLinks = [
	{
		label: "Features",
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

export interface HeaderProps {
	leading?: React.ReactNode;
}

export function Header({ leading }: HeaderProps) {
	const scrolled = useScroll(10);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 mx-auto w-full max-w-4xl border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out",
				{
					"border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-3xl md:shadow":
						scrolled,
				}
			)}
		>
			<nav
				className={cn(
					"flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:ease-out",
					{
						"md:px-2": scrolled,
					}
				)}
			>
				<div className="flex items-center gap-2">
					{leading}
					<a className="rounded-md p-2 hover:bg-accent" href="#">
						<Logo className="h-4.5" />
					</a>
				</div>
				<div className="flex items-center gap-2">
					<div className="hidden items-center gap-1 md:flex">
						{navLinks.map((link, i) => (
							<a
								className={buttonVariants({ variant: "ghost" })}
								href={link.href}
								key={i}
							>
								{link.label}
							</a>
						))}
					</div>
					<ModeToggle />
					<MobileNav />
				</div>
			</nav>
		</header>
	);
}

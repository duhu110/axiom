"use client";

import {
    Archive,
    Loader2,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import type { Conversation } from "@/features/bot/types";

export interface AIChatHistoryProps {
    conversations: Conversation[];
    activeConversationId?: string;
    onSelect?: (conversationId: string) => void;
    onNewConversation?: () => void;
    onRename?: (conversationId: string, newTitle: string) => Promise<void>;
    onDelete?: (conversationId: string) => Promise<void>;
    onArchive?: (conversationId: string) => Promise<void>;
    onUnarchive?: (conversationId: string) => Promise<void>;
    className?: string;
    showSearch?: boolean;
    showNewButton?: boolean;
}

interface EmptyStateProps {
    searchQuery: string;
    showNewButton: boolean;
    onNewConversation?: () => void;
}

function EmptyState({
    searchQuery,
    showNewButton,
    onNewConversation,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Search className="size-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
                <p className="font-medium text-sm">
                    {searchQuery ? "No conversations found" : "No conversations"}
                </p>
                <p className="text-muted-foreground text-sm">
                    {searchQuery
                        ? "Try a different search term"
                        : "Start a new conversation to get started"}
                </p>
            </div>
            {!searchQuery && showNewButton && onNewConversation && (
                <Button
                    className="min-h-[44px] sm:min-h-[24px]"
                    onClick={onNewConversation}
                    type="button"
                    variant="outline"
                >
                    <Plus className="size-4" />
                    New Conversation
                </Button>
            )}
        </div>
    );
}

interface ConversationItemProps {
    conversation: Conversation;
    isActive: boolean;
    isEditing: boolean;
    editValue: string;
    onSelect: () => void;
    onRenameStart: () => void;
    onRenameSubmit: () => void;
    onRenameCancel: () => void;
    onEditValueChange: (value: string) => void;
    onRename?: (conversationId: string, newTitle: string) => Promise<void>;
    onDelete?: (conversationId: string) => Promise<void>;
    onArchive?: (conversationId: string) => Promise<void>;
    onUnarchive?: (conversationId: string) => Promise<void>;
    isLoading?: boolean;
}

function ConversationItem({
    conversation,
    isActive,
    isEditing,
    editValue,
    onSelect,
    onRenameStart,
    onRenameSubmit,
    onRenameCancel,
    onEditValueChange,
    onRename,
    onDelete,
    onArchive,
    onUnarchive,
    isLoading = false,
}: ConversationItemProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDelete = useCallback(async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete(conversation.id);
            setShowDeleteDialog(false);
        } catch (error) {
            console.error("Failed to delete conversation:", error);
        } finally {
            setIsDeleting(false);
        }
    }, [conversation.id, onDelete]);

    return (
        <>
            <div
                className={cn(
                    "group relative flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
                    "min-h-[40px] touch-manipulation [-webkit-tap-highlight-color:transparent]",
                    isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground/80 hover:bg-muted/40",
                    isLoading && "pointer-events-none opacity-50"
                )}
                role="listitem"
            >
                <button
                    aria-label={`Select conversation ${conversation.title}`}
                    className="flex min-h-[36px] min-w-0 flex-1 items-center rounded-sm text-left text-sm [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    disabled={isLoading}
                    onClick={onSelect}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect();
                        }
                    }}
                    type="button"
                >
                    {isEditing ? (
                        <input
                            aria-label="Edit conversation title"
                            className="min-h-[36px] w-full rounded-md border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                            onBlur={onRenameSubmit}
                            onChange={(e) => onEditValueChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    onRenameSubmit();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    onRenameCancel();
                                }
                            }}
                            ref={inputRef}
                            value={editValue}
                        />
                    ) : (
                        <span className="block w-full truncate">{conversation.title}</span>
                    )}
                </button>
                {!isEditing && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    aria-label={`More options for ${conversation.title}`}
                                    className="min-h-[36px] min-w-[36px] shrink-0 opacity-0 transition-opacity [-webkit-tap-highlight-color:transparent] focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
                                    disabled={isLoading}
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                >
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onRename && (
                                    <DropdownMenuItem
                                        disabled={isLoading}
                                        onClick={onRenameStart}
                                    >
                                        <Pencil className="size-4" />
                                        Rename
                                    </DropdownMenuItem>
                                )}
                                {onArchive && (
                                    <DropdownMenuItem
                                        disabled={isLoading}
                                        onClick={() => onArchive(conversation.id)}
                                    >
                                        <Archive className="size-4" />
                                        Archive
                                    </DropdownMenuItem>
                                )}
                                {onUnarchive && (
                                    <DropdownMenuItem
                                        disabled={isLoading}
                                        onClick={() => onUnarchive(conversation.id)}
                                    >
                                        <Archive className="size-4" />
                                        Unarchive
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            disabled={isLoading}
                                            onClick={() => setShowDeleteDialog(true)}
                                            variant="destructive"
                                        >
                                            <Trash2 className="size-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{conversation.title}&quot;?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
                            disabled={isDeleting}
                            onClick={handleDelete}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

const PAGE_SIZE = 20;

export default function ChatHistory({
    conversations,
    activeConversationId,
    onSelect,
    onNewConversation,
    onRename,
    onDelete,
    onArchive,
    onUnarchive,
    className,
    showSearch = true,
    showNewButton = true,
}: AIChatHistoryProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
        {}
    );
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;

        const query = searchQuery.toLowerCase().trim();
        return conversations.filter((conv) => conv.title.toLowerCase().includes(query));
    }, [conversations, searchQuery]);

    const visibleConversations = useMemo(
        () => filteredConversations.slice(0, visibleCount),
        [filteredConversations, visibleCount]
    );

    const hasMore = visibleCount < filteredConversations.length;

    const handleRenameStart = useCallback((conversation: Conversation) => {
        setEditingId(conversation.id);
        setEditValue(conversation.title);
    }, []);

    const handleRenameSubmit = useCallback(
        async (conversationId: string) => {
            if (!(onRename && editValue.trim())) {
                setEditingId(null);
                return;
            }

            const trimmedValue = editValue.trim();
            if (trimmedValue === conversations.find((c) => c.id === conversationId)?.title) {
                setEditingId(null);
                return;
            }

            setLoadingStates((prev) => ({ ...prev, [conversationId]: true }));
            try {
                await onRename(conversationId, trimmedValue);
                setEditingId(null);
            } catch (error) {
                console.error("Failed to rename conversation:", error);
            } finally {
                setLoadingStates((prev) => {
                    const next = { ...prev };
                    delete next[conversationId];
                    return next;
                });
            }
        },
        [onRename, editValue, conversations]
    );

    const handleRenameCancel = useCallback(() => {
        setEditingId(null);
        setEditValue("");
    }, []);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, conversations.length]);

    const handleScroll = useCallback(() => {
        const node = containerRef.current;
        if (!node || !hasMore) return;
        const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
        if (distance < 160) {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredConversations.length));
        }
    }, [filteredConversations.length, hasMore]);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const listener = () => handleScroll();
        node.addEventListener("scroll", listener, { passive: true });
        return () => node.removeEventListener("scroll", listener);
    }, [handleScroll]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const items = containerRef.current?.querySelectorAll<HTMLElement>(
                    '[role="listitem"] button'
                );
                if (!items || items.length === 0) return;

                const currentIndex = Array.from(items).findIndex(
                    (item) => item === document.activeElement
                );
                const nextIndex =
                    e.key === "ArrowDown"
                        ? (currentIndex + 1) % items.length
                        : currentIndex === -1
                            ? items.length - 1
                            : (currentIndex - 1 + items.length) % items.length;
                items[nextIndex]?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
                {showSearch && (
                    <div className="px-2 pb-2">
                        <InputGroup>
                            <InputGroupAddon>
                                <Search className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                                aria-label="Search conversations"
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations"
                                value={searchQuery}
                            />
                        </InputGroup>
                    </div>
                )}
                <CardContent
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-2"
                    ref={containerRef}
                >
                {filteredConversations.length === 0 ? (
                    <EmptyState
                        onNewConversation={onNewConversation}
                        searchQuery={searchQuery}
                        showNewButton={showNewButton}
                    />
                ) : (
                    <div className="flex flex-col gap-0.5" role="list">
                        {visibleConversations.map((conversation) => {
                            const isActive = conversation.id === activeConversationId;
                            const isEditing = editingId === conversation.id;

                            return (
                                <ConversationItem
                                    conversation={conversation}
                                    editValue={editValue}
                                    isActive={isActive}
                                    isEditing={isEditing}
                                    isLoading={loadingStates[conversation.id]}
                                    key={conversation.id}
                                    onArchive={onArchive}
                                    onDelete={onDelete}
                                    onEditValueChange={setEditValue}
                                    onRename={onRename}
                                    onRenameCancel={handleRenameCancel}
                                    onRenameStart={() => handleRenameStart(conversation)}
                                    onRenameSubmit={() => handleRenameSubmit(conversation.id)}
                                    onSelect={() => onSelect?.(conversation.id)}
                                    onUnarchive={onUnarchive}
                                />
                            );
                        })}
                        {hasMore && (
                            <div className="py-2 text-center text-muted-foreground text-xs">
                                加载更多…
                            </div>
                        )}
                    </div>
                )}
                </CardContent>
            </div>
        </>
    );
}

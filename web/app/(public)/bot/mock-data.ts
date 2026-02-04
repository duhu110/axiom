import type { BotMessage, BotUser, BotNavItem, Conversation } from "@/features/bot/types";
import { nanoid } from "nanoid";
import {
  BookOpen,
  Bot as BotIcon,
  Settings2,
  SquareTerminal,
} from "lucide-react";

// 会话列表数据
export const mockConversations: Conversation[] = [
  { id: "conv-1", title: "React Hooks 学习" },
  { id: "conv-2", title: "数据库查询优化" },
  { id: "conv-3", title: "TypeScript 类型系统" },
  { id: "conv-4", title: "Next.js App Router" },
  { id: "conv-5", title: "Tailwind CSS 技巧" },
  { id: "conv-6", title: "API 设计评审" },
  { id: "conv-7", title: "性能压测方案" },
  { id: "conv-8", title: "日志告警策略" },
  { id: "conv-9", title: "多租户隔离" },
  { id: "conv-10", title: "支付回调重试" },
  { id: "conv-11", title: "数据看板改版" },
  { id: "conv-12", title: "异常监控接入" },
  { id: "conv-13", title: "CI/CD 优化" },
  { id: "conv-14", title: "移动端适配" },
  { id: "conv-15", title: "A/B 实验设计" },
  { id: "conv-16", title: "搜索召回优化" },
  { id: "conv-17", title: "权限模型梳理" },
  { id: "conv-18", title: "灰度发布计划" },
  { id: "conv-19", title: "国际化翻译" },
  { id: "conv-20", title: "客服机器人配置" },
  { id: "conv-21", title: "迁移计划草案" },
  { id: "conv-22", title: "未归档草稿" },
  { id: "conv-23", title: "产品需求对齐" },
  { id: "conv-24", title: "权限申请流程" },
  { id: "conv-25", title: "服务依赖梳理" },
  { id: "conv-26", title: "缓存命中率" },
  { id: "conv-27", title: "低代码接入" },
  { id: "conv-28", title: "运营活动配置" },
  { id: "conv-29", title: "Push 文案" },
  { id: "conv-30", title: "报表导出优化" },
  { id: "conv-31", title: "活动转化率" },
  { id: "conv-32", title: "SDK 升级计划" },
  { id: "conv-33", title: "多端数据一致性" },
  { id: "conv-34", title: "登录风控策略" },
  { id: "conv-35", title: "客服话术整理" },
];

// 消息列表数据（会话1的消息）
export const mockMessages: BotMessage[] = [
  {
    key: nanoid(),
    from: "user",
    data: {
      type: "text",
      content: "How do React hooks work and when should I use them?",
    },
    attachments: [
      {
        id: nanoid(),
        type: "file",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
        mediaType: "image/jpeg",
        filename: "palace-of-fine-arts.jpg",
      },
      {
        id: nanoid(),
        type: "file",
        url: "",
        mediaType: "application/pdf",
        filename: "react-hooks-guide.pdf",
      },
    ],
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    key: nanoid(),
    from: "assistant",
    data: {
      type: "text",
      content: `# React Hooks Guide

React hooks are functions that let you "hook into" React state and lifecycle features from function components. Here's what you need to know:
## Core Hooks
### useState
Adds state to functional components:
\`\`\`jsx
const [count, setCount] = useState(0);

return (
  <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
);
\`\`\`

### useEffect
Handles side effects (data fetching, subscriptions, DOM updates):

\`\`\`jsx
useEffect(() => {
  document.title = \`You clicked \${count} times\`;

  // Cleanup function (optional)
  return () => {
    document.title = 'React App';
  };
}, [count]); // Dependency array
\`\`\`

## When to Use Hooks

- **Function components** - Hooks only work in function components
- **Replacing class components** - Modern React favors hooks over classes
- **Sharing stateful logic** - Create custom hooks to reuse logic
- **Class components** - Use lifecycle methods instead

## Rules of Hooks

1. Only call hooks at the **top level** (not inside loops, conditions, or nested functions)
2. Only call hooks from **React functions** (components or custom hooks)

Would you like to explore more advanced hooks like \`useCallback\` or \`useMemo\`?`,
      versions: [
        {
          id: nanoid(),
          content: `# React Hooks Guide

React hooks are functions that let you "hook into" React state and lifecycle features from function components. Here's what you need to know:
## Core Hooks
### useState
Adds state to functional components:
\`\`\`jsx
const [count, setCount] = useState(0);

return (
  <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
);
\`\`\`

### useEffect
Handles side effects (data fetching, subscriptions, DOM updates):

\`\`\`jsx
useEffect(() => {
  document.title = \`You clicked \${count} times\`;

  // Cleanup function (optional)
  return () => {
    document.title = 'React App';
  };
}, [count]); // Dependency array
\`\`\`

## When to Use Hooks

- **Function components** - Hooks only work in function components
- **Replacing class components** - Modern React favors hooks over classes
- **Sharing stateful logic** - Create custom hooks to reuse logic
- **Class components** - Use lifecycle methods instead

## Rules of Hooks

1. Only call hooks at the **top level** (not inside loops, conditions, or nested functions)
2. Only call hooks from **React functions** (components or custom hooks)

Would you like to explore more advanced hooks like \`useCallback\` or \`useMemo\`?`,
        },
        {
          id: nanoid(),
          content: `React hooks are special functions that let you use React features in function components. The most common ones are:

- **useState** - for managing component state
- **useEffect** - for side effects like data fetching
- **useContext** - for consuming context values
- **useRef** - for accessing DOM elements

Here's a simple example:

\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
\`\`\`

Which specific hook would you like to learn more about?`,
        },
        {
          id: nanoid(),
          content: `Absolutely! React hooks are a powerful feature introduced in React 16.8. They solve several problems:

## Key Benefits

1. **Simpler code** - No need for class components
2. **Reusable logic** - Extract stateful logic into custom hooks
3. **Better organization** - Group related code together

## Most Popular Hooks

| Hook | Purpose |
|------|---------|
| useState | Add state to components |
| useEffect | Handle side effects |
| useContext | Access context values |
| useReducer | Complex state logic |
| useCallback | Memoize functions |
| useMemo | Memoize values |

The beauty of hooks is that they let you reuse stateful logic without changing your component hierarchy. Want to dive into a specific hook?`,
        },
      ],
    },
    createdAt: new Date(Date.now() - 3500000),
  },
  {
    key: nanoid(),
    from: "user",
    data: {
      type: "text",
      content: "Can you query the database to see how many users signed up this month?",
    },
    createdAt: new Date(Date.now() - 2000000),
  },
  {
    key: nanoid(),
    from: "assistant",
    data: {
      type: "tool",
      tool: {
        type: "tool-database_query",
        toolCallId: nanoid(),
        state: "output-available",
        input: {
          query: "SELECT * FROM users WHERE created_at >= '2024-01-01' LIMIT 5",
          database: "analytics",
        },
        output: `| User ID | Name | Email | Created At |
|---------|------|-------|------------|
| 1 | John Doe | john@example.com | 2024-01-15 |
| 2 | Jane Smith | jane@example.com | 2024-01-20 |
| 3 | Bob Wilson | bob@example.com | 2024-02-01 |
| 4 | Alice Brown | alice@example.com | 2024-02-10 |
| 5 | Charlie Davis | charlie@example.com | 2024-02-15 |`,
      },
    },
    createdAt: new Date(Date.now() - 1900000),
  },
  {
    key: nanoid(),
    from: "assistant",
    data: {
      type: "text",
      content: "Based on the query results, **5 new users** signed up this month. The signups are evenly distributed throughout January and February.",
    },
    createdAt: new Date(Date.now() - 1800000),
  },
];

export const mockUser: BotUser = {
  name: "shadcn",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
};

export const mockNavMain: BotNavItem[] = [
  {
    title: "Playground",
    url: "#",
    icon: SquareTerminal,
    isActive: true,
    items: [
      { title: "History", url: "#" },
      { title: "Starred", url: "#" },
      { title: "Settings", url: "#" },
    ],
  },
  {
    title: "Models",
    url: "#",
    icon: BotIcon,
    items: [
      { title: "Genesis", url: "#" },
      { title: "Explorer", url: "#" },
      { title: "Quantum", url: "#" },
    ],
  },
  {
    title: "Documentation",
    url: "#",
    icon: BookOpen,
    items: [
      { title: "Introduction", url: "#" },
      { title: "Get Started", url: "#" },
      { title: "Tutorials", url: "#" },
      { title: "Changelog", url: "#" },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      { title: "General", url: "#" },
      { title: "Team", url: "#" },
      { title: "Billing", url: "#" },
      { title: "Limits", url: "#" },
    ],
  },
];

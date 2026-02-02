import { z } from 'zod';

export const loginSchema = z.object({
  phone: z.string().min(11, '手机号格式不正确').max(11, '手机号格式不正确'),
  code: z.string().min(4, '验证码格式不正确').max(6, '验证码格式不正确'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

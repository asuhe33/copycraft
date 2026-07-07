/**
 * 邮件通道（ESM）
 * MVP 阶段仅打日志；返回 devOnly=true 让调用方把验证码返给客户端演示。
 * 接 PROD 时设 SMTP_HOST 环境变量即可切换（TODO：接 nodemailer/Resend）。
 */
const IS_PROD = !!process.env.SMTP_HOST;

export async function sendVerifyCode(email, code) {
  if (IS_PROD) {
    console.warn(`[mailer] PROD 模式未实现邮件发送：${email}`);
    return { code: null, devOnly: false };
  }
  console.log(`[mailer:dev] 验证码 ${email} -> ${code}`);
  return { code, devOnly: true };
}

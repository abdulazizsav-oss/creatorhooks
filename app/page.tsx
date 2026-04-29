import { HookWorkspace } from "@/components/hook-workspace";

export default function HomePage() {
  return <HookWorkspace botUsername={process.env.TELEGRAM_BOT_USERNAME ?? ""} />;
}

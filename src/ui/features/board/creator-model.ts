import type { ExternalObservation } from "../../../external-observations.js";
import type { TaskCreatorProfile } from "../../../task-creator-profiles.js";
type User = { id: string; name?: string; handle?: string; avatar?: string | null; initials?: string };
export type CreatorPresentation = { name: string; avatar: string | null; initials: string; tooltip: string; filterKey: string; known: boolean };
export function safeCreatorAvatar(value: unknown): string | null {
  return typeof value === "string" && value.length <= 400_000 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : null;
}
/** A creator is independent of agent_id, user_assigned and executor declarations. */
export function taskCreatorPresentation(issue: { external_observation?: ExternalObservation; creator_user_id?: string | null; creator_user?: User | null }, profiles: TaskCreatorProfile[], users: User[]): CreatorPresentation {
  const record = issue.external_observation;
  if (record?.creator.display_source === "user_mapping" && record.creator.local_profile_id) {
    const profile = profiles.find(item => item.id === record.creator.local_profile_id);
    if (profile) return { name: profile.name, avatar: safeCreatorAvatar(profile.avatar), initials: Array.from(profile.name).slice(0, 2).join(""),
      tooltip: `创建者：${profile.name}；来源：用户指定的本地映射；平台身份未验证；当前执行者：${record.executor?.name || "未知"}`,
      filterKey: `profile:${profile.id}`, known: true };
  }
  if (!record && issue.creator_user_id) {
    const user = issue.creator_user?.id === issue.creator_user_id ? issue.creator_user : users.find(item => item.id === issue.creator_user_id);
    if (user) { const name = user.name || user.handle || "用户"; return { name, avatar: safeCreatorAvatar(user.avatar), initials: user.initials || Array.from(name).slice(0, 2).join(""),
      tooltip: `创建者：${name}；来源：任务记录的用户 ID`, filterKey: `user:${user.id}`, known: true }; }
  }
  return { name: "未知创建者", avatar: null, initials: "?", known: false, filterKey: "unknown",
    tooltip: record ? `创建者来源：任务自报；声明名称：${record.declared_creator_name || record.creator.name || "未知"}；身份尚未确认；当前执行者：${record.executor?.name || "未知"}` : "历史任务未记录可解析的创建者；当前执行者不代表创建者" };
}

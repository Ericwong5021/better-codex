import type { CreatorPresentation } from "./creator-model.js";
function avatarMarkup(creator: CreatorPresentation, escape: (value: string) => string) {
  return `<span class="better-codex-card-avatar is-creator${creator.avatar ? " has-image" : ""}" data-creator-avatar aria-hidden="true"><span class="better-codex-creator-initials">${escape(creator.initials)}</span>${creator.avatar ? `<img data-creator-image src="${escape(creator.avatar)}" alt="">` : ""}</span>`;
}
export function creatorMarkup(creator: CreatorPresentation, escape: (value: string) => string, translate: (value: string) => string) {
  return `<span class="better-codex-card-creator" data-card-creator="${escape(creator.filterKey)}" title="${escape(translate(creator.tooltip))}" aria-label="${escape(translate(`创建者：${creator.name}`))}">${avatarMarkup(creator, escape)}</span>`;
}
export function creatorDetailMarkup(creator: CreatorPresentation, escape: (value: string) => string, translate: (value: string) => string) {
  return `<span class="better-codex-detail-creator" data-detail-creator="${escape(creator.filterKey)}" title="${escape(translate(creator.tooltip))}">${avatarMarkup(creator, escape)}<span data-creator-name>${escape(translate(`创建者：${creator.name}`))}</span></span>`;
}

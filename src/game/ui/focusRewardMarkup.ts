import { REWARD_BUILDINGS } from '../data/rewardBuildings';
import { shouldReduceFocusMotion } from '../focus/focusConfig';

export const REWARD_ASSET_ROOT = '/assets/reward-v2';

export function buildingIdAttribute(id: string): string {
  return id.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const confettiColors = ['#f8be0f', '#f5708c', '#91e0dd', '#686af1', '#a4e471', '#f5708c'];

export function focusRewardMarkup(buildingId: string, assetId: string, problem: string | null): string {
  const building = REWARD_BUILDINGS.find((reward) => reward.id === assetId);
  if (!building) return '';

  const reducedMotion = shouldReduceFocusMotion();
  const confetti = reducedMotion ? '' : Array.from({ length: 44 }, (_, index) => {
    const x = (index * 37 + 4) % 101;
    return `<i style="--x:${x}%;--delay:${(index * 43) % 360}ms;--duration:${1350 + (index * 97) % 540}ms;--drift:${index % 2 === 0 ? -1 : 1};--size:${7 + index % 8};--color:${confettiColors[index % confettiColors.length]}"></i>`;
  }).join('');

  return `
    <section class="focus-reward${reducedMotion ? ' is-reduced-motion' : ''}" aria-label="领取奖励">
      <div class="reward-success" aria-hidden="true">
        <img class="reward-success-mascot" src="${REWARD_ASSET_ROOT}/timecount_img_success.png" alt="">
        <img class="reward-success-stars reward-success-stars-left" src="${REWARD_ASSET_ROOT}/timecount_img_success.png" alt="">
        <img class="reward-success-stars reward-success-stars-right" src="${REWARD_ASSET_ROOT}/timecount_img_success.png" alt="">
      </div>
      <div class="reward-glints" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <svg class="reward-wave" viewBox="0 0 812 490" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#fff" d="M0 82 C60 19 150 -2 226 24 S425 103 537 35 S748 -9 812 34 V490 H0 Z"/>
        <path fill="#f7f5e2" d="M0 101 C60 38 150 17 226 43 S425 122 537 54 S748 10 812 53 V490 H0 Z"/>
      </svg>
      <div class="reward-page">
        <img class="reward-edge reward-edge-top" src="${REWARD_ASSET_ROOT}/reward_shape.png" alt="">
        <img class="reward-edge reward-edge-bottom" src="${REWARD_ASSET_ROOT}/reward_shape.png" alt="">
        <div class="reward-popup">
          <img class="reward-popup-panel" src="${REWARD_ASSET_ROOT}/reward_popup_pannel.png" alt="约定完成！">
          <div class="reward-building"><img src="${building.url}" alt="${building.name}"></div>
          <img class="reward-popup-mascot" src="${REWARD_ASSET_ROOT}/reward_popup_xbl.png" alt="">
          <div class="reward-popup-action">
            <button type="button" class="reward-place" data-action="place-building" data-building-id="${buildingIdAttribute(buildingId)}" aria-label="去放置"${problem ? ' disabled' : ''}>
              <img class="reward-button-base" src="${REWARD_ASSET_ROOT}/reward_popup_btn.png" alt="">
              <span class="reward-button-sheen" aria-hidden="true"></span>
              <img class="reward-button-label" src="${REWARD_ASSET_ROOT}/reward_popup_btn_font.png" alt="">
            </button>
            ${problem ? `<p class="reward-placement-note">${problem}，奖励已存入建筑收纳</p>` : ''}
          </div>
        </div>
      </div>
    </section>
    ${confetti ? `<div class="reward-confetti" aria-hidden="true">${confetti}</div>` : ''}`;
}

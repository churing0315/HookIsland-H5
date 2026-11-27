export const GUIDE_ASSETS = '/assets/guide';

export const GUIDE_STEPS = [
  { text: '你好呀，欢迎来到拉勾岛！我来给你介绍一下吧' },
  { text: '点击这里开始装饰小岛吧', target: '.pinky-button' },
  { text: '在这里我们可以选择想做的任务', target: '.task-v2-next' },
  { text: '选好任务时长！时间越长，获得的建筑越高级哦', target: '.task-v2-duration[data-minutes="10"]' },
  { text: '按住别松开，快来和我拉个勾～', target: '.task-v2-hold-button' },
  { text: '现在是专注时刻，时间到了我会告诉你哟' },
  { text: '时间到！' },
  { text: '太棒啦！我们获得了新的建筑，快去小岛布置吧', target: '.reward-place' },
  { text: '拖动建筑，放到小岛上', target: '.placement-preview' },
  { text: '大功告成！长按建筑，可以随时调整位置' },
  { text: '未摆放的建筑，会自动存进收纳箱里', target: '.building-storage-toggle' },
  { text: '接下来，小岛就交给你咯' },
] satisfies ReadonlyArray<{ text: string; target?: string }>;

export function guideVoiceSource(step: number): string {
  return `${GUIDE_ASSETS}/guide_voice_${String(step + 1).padStart(2, '0')}.mp3`;
}

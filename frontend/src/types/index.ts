/**
 * 與 YouTube 聽打練習相關的共用型別（對齊課本「types」層）。
 */

export type { SrtCue } from '../lib/srt'
export type { YoutubeOEmbed } from '../lib/youtube'

/** 播放模式：單句循環或單次。 */
export type PlayMode = 'loop' | 'once'

/** 影片練習會用到的播放速度（倍率）。 */
export type PlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2

/** 目前字幕分段之時間區間（秒，對齊課本 currentSegment）。 */
export type VideoSegmentTimes = {
  startTime: number
  endTime: number
}

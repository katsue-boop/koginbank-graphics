// Google Analytics 4 カスタムイベント送信用の小さなヘルパー。
// index.html で読み込まれる gtag.js が window.gtag を用意する。
// gtag が未定義（読み込み前・広告ブロッカー等）でも落ちないようにガードする。
export function gaEvent(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

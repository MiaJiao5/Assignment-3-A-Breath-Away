// A controllable speech ending for layout/timing tests; production still uses
// the owner's WAV/MP3. No automatic completion can race a viewport comparison.
async function installControlledNarration(page) {
  await page.route(/\/src\/audio\/introVoice\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: 'export const INTRO_VOICE_URLS = {en:null,zh:null};',
  }));
  await page.addInitScript(() => {
    window.__introSpoken = [];
    window.__introUtterance = null;
    window.__finishIntro = () => window.__introUtterance?.onend?.();
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function(text) { this.text = text; } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{name:'Samantha',lang:'en-US',localService:true},{name:'Xiaoxiao',lang:'zh-CN',localService:true}],
      addEventListener() {}, removeEventListener() {},
      speak(utterance) { window.__introUtterance = utterance; window.__introSpoken.push({lang:utterance.lang,text:utterance.text}); },
      cancel() { window.__introUtterance = null; },
    } });
  });
}
module.exports = { installControlledNarration };

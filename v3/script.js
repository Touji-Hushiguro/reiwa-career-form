var formData = {
    workStart: '',
    gender: '',
    birthDate: '',
    prefecture: '',
    fullName: '',
    phone: '',
    email: '',
    interviewDateTime1: '',
    interviewDateTime2: '',
    interviewDateTime3: '',
    interviewStart: '',
    interviewEnd: '',
    utmSource: '',
    utmContent: ''
};

var currentStep = 1;
var totalSteps = 6;  // v3: step1〜6 (面談日時選択なし)

var strengths = [
    { step: 2, title: '平均年収100万円UP',    emoji: '💵' },
    { step: 4, title: '未経験特化',            emoji: '✨' },
    { step: 6, title: '全て無料',              emoji: '🆓' }
];

// Vercel API (旧GAS Web App から移行)
var API_BASE = 'https://reiwa-form-api.vercel.app';
var FORM_URL = API_BASE + '/api/form';
// v3: 面談日時選択なし → /api/slots は不要だが、後方互換のため残す
var SLOTS_URL = API_BASE + '/api/slots';
var GAS_URL = FORM_URL;

// v3: step8/カレンダー枠キャッシュは未使用 (削除済み)

window.showStrength = function(i) {
    var s = strengths[i];
    var b = document.getElementById('strengthBox');
    var t = document.getElementById('strengthBoxTitle');
    t.textContent = s.emoji + ' ' + s.title;
    if (b.style.display === 'none') {
        b.style.display = 'block';
    }
};

window.updateProgress = function() {
    var p = (currentStep / totalSteps) * 100;
    document.getElementById('progressBar').style.width = p + '%';
};

window.selectOption = function(f, v, e) {
    formData[f] = v;
    var c = document.getElementById('step' + currentStep);
    var bs = c.querySelectorAll('.option-button');
    bs.forEach(function(b) { b.classList.remove('selected'); });
    e.classList.add('selected');
    var n = document.getElementById('nextBtn' + currentStep);
    if (n) n.disabled = false;
    if (currentStep === 1 || currentStep === 2) {
        setTimeout(function() { nextStep(); }, 300);
    }
};

window.validateStep3 = function() {
    var y = document.getElementById('birthYear').value;
    var m = document.getElementById('birthMonth').value;
    var d = document.getElementById('birthDay').value;
    var errEl = document.getElementById('birthError');
    if (y === '' || m === '' || d === '') {
        if (errEl) errEl.style.display = 'none';
        return;
    }
    // 21歳未満は応募不可
    var birth = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        age--;
    }
    if (age < 21) {
        if (errEl) errEl.style.display = 'block';
        return;
    }
    if (errEl) errEl.style.display = 'none';
    setTimeout(function() { nextStep(); }, 300);
};

window.validateStep4 = function() {
    var p = document.getElementById('prefecture').value;
    if (p !== '') {
        setTimeout(function() { nextStep(); }, 300);
    }
};

// IME入力中フラグ（カタカナ変換のカーソルバグ防止）
var isComposingName = false;
(function() {
    var el = document.getElementById('fullName');
    if (el) {
        el.addEventListener('compositionstart', function() { isComposingName = true; });
        el.addEventListener('compositionend', function() {
            isComposingName = false;
            validateStep5();
        });
    }
})();

window.validateStep5 = function() {
    if (isComposingName) return; // IME変換中はスキップ

    var input = document.getElementById('fullName');
    var raw = input.value;

    // ひらがな → カタカナに自動変換
    var converted = raw.replace(/[\u3041-\u3096]/g, function(ch) {
        return String.fromCharCode(ch.charCodeAt(0) + 0x60);
    });
    // 半角カナ → 全角カナに変換（濁点・半濁点の合成に対応）
    var halfToFullDakuten = {
        'ｶ':'ガ','ｷ':'ギ','ｸ':'グ','ｹ':'ゲ','ｺ':'ゴ',
        'ｻ':'ザ','ｼ':'ジ','ｽ':'ズ','ｾ':'ゼ','ｿ':'ゾ',
        'ﾀ':'ダ','ﾁ':'ヂ','ﾂ':'ヅ','ﾃ':'デ','ﾄ':'ド',
        'ﾊ':'バ','ﾋ':'ビ','ﾌ':'ブ','ﾍ':'ベ','ﾎ':'ボ','ｳ':'ヴ'
    };
    var halfToFullHandakuten = {
        'ﾊ':'パ','ﾋ':'ピ','ﾌ':'プ','ﾍ':'ペ','ﾎ':'ポ'
    };
    var halfKanaMap = {
        'ｱ':'ア','ｲ':'イ','ｳ':'ウ','ｴ':'エ','ｵ':'オ','ｶ':'カ','ｷ':'キ','ｸ':'ク','ｹ':'ケ','ｺ':'コ',
        'ｻ':'サ','ｼ':'シ','ｽ':'ス','ｾ':'セ','ｿ':'ソ','ﾀ':'タ','ﾁ':'チ','ﾂ':'ツ','ﾃ':'テ','ﾄ':'ト',
        'ﾅ':'ナ','ﾆ':'ニ','ﾇ':'ヌ','ﾈ':'ネ','ﾉ':'ノ','ﾊ':'ハ','ﾋ':'ヒ','ﾌ':'フ','ﾍ':'ヘ','ﾎ':'ホ',
        'ﾏ':'マ','ﾐ':'ミ','ﾑ':'ム','ﾒ':'メ','ﾓ':'モ','ﾔ':'ヤ','ﾕ':'ユ','ﾖ':'ヨ',
        'ﾗ':'ラ','ﾘ':'リ','ﾙ':'ル','ﾚ':'レ','ﾛ':'ロ','ﾜ':'ワ','ｦ':'ヲ','ﾝ':'ン',
        'ｧ':'ァ','ｨ':'ィ','ｩ':'ゥ','ｪ':'ェ','ｫ':'ォ','ｬ':'ャ','ｭ':'ュ','ｮ':'ョ','ｯ':'ッ','ｰ':'ー'
    };
    // 先に濁点・半濁点の合成を処理（2文字 → 1文字）
    converted = converted.replace(/([\uff66-\uff9d])[\uff9e]/g, function(match, base) {
        return halfToFullDakuten[base] || (halfKanaMap[base] || base);
    });
    converted = converted.replace(/([\uff66-\uff9d])[\uff9f]/g, function(match, base) {
        return halfToFullHandakuten[base] || (halfKanaMap[base] || base);
    });
    // 残りの単独半角カナを変換
    converted = converted.replace(/[\uff61-\uff9f]/g, function(ch) { return halfKanaMap[ch] || ch; });

    // カーソル位置を保持しつつ値を更新
    if (converted !== raw) {
        var pos = input.selectionStart;
        input.value = converted;
        try { input.setSelectionRange(pos, pos); } catch(e) {}
    }

    var val = converted.trim();
    // カタカナ（全角）+ スペース（半角/全角）+ 長音符 + 中黒 のみ許可
    var kanaRegex = /^[\u30A0-\u30FF\u3000\s・]+$/;
    var isValid = val !== '' && kanaRegex.test(val);

    var err = document.getElementById('fullNameError');
    if (val !== '' && !isValid) {
        if (err) err.style.display = 'block';
    } else {
        if (err) err.style.display = 'none';
    }
    document.getElementById('nextBtn5').disabled = !isValid;
};

window.validateStep6 = function() {
    var p = document.getElementById('phone').value;
    var pr = /^(0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10})$/;
    var pv = pr.test(p.replace(/-/g, ''));
    var pe = document.getElementById('phoneError');
    if (p.trim() !== '' && !pv) { pe.style.display = 'block'; } else { pe.style.display = 'none'; }

    var e = document.getElementById('email').value;
    var er = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var ev = er.test(e);
    var ee = document.getElementById('emailError');
    if (e.trim() !== '' && !ev) { ee.style.display = 'block'; } else { ee.style.display = 'none'; }

    document.getElementById('nextBtn6').disabled = !(pv && ev);
};

// ========== SMS認証（OTP）フロー ==========

window.sendOTP = function() {
    var phone = document.getElementById('phone').value;
    var btn = document.getElementById('nextBtn6');
    btn.disabled = true;
    btn.textContent = '送信中...';

    fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendOTP', phone: phone })
    })
        .then(function(res) {
            return res.text().then(function(text) {
                try { return JSON.parse(text); }
                catch(e) { throw new Error('JSONパースエラー: ' + text.substring(0, 200)); }
            });
        })
        .then(function(json) {
            if (json.success) {
                // OTP入力画面に切り替え
                document.getElementById('phoneInputArea').style.display = 'none';
                document.getElementById('otpInputArea').style.display = 'block';
                document.getElementById('step6Title').textContent = '認証コードを入力してください';
                document.getElementById('step6Note').style.display = 'none';
                document.getElementById('otpSentMessage').textContent =
                    phone + ' に6桁の認証コードを送信しました。';
                document.getElementById('otpCode').focus();
            } else {
                alert('SMS送信に失敗しました: ' + (json.error || '不明なエラー'));
                btn.disabled = false;
                btn.textContent = '認証コードを送信';
            }
        })
        .catch(function(err) {
            alert('通信エラーが発生しました。もう一度お試しください。');
            btn.disabled = false;
            btn.textContent = '認証コードを送信';
        });
};

window.validateOTP = function() {
    var code = document.getElementById('otpCode').value.replace(/\D/g, '');
    document.getElementById('verifyBtn').disabled = code.length !== 6;
};

window.verifyOTP = function() {
    var phone = document.getElementById('phone').value;
    var code = document.getElementById('otpCode').value.replace(/\D/g, '');
    var btn = document.getElementById('verifyBtn');
    var errEl = document.getElementById('otpError');
    btn.disabled = true;
    btn.textContent = '認証中...';
    errEl.style.display = 'none';

    fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verifyOTP', phone: phone, code: code })
    })
        .then(function(res) {
            return res.text().then(function(text) {
                try { return JSON.parse(text); }
                catch(e) { throw new Error('JSONパースエラー: ' + text.substring(0, 200)); }
            });
        })
        .then(function(json) {
            if (json.success && json.verified) {
                // v3: 認証成功 → finalSubmit (interview 空) → 完了画面表示
                v3SubmitAndComplete();
            } else {
                errEl.textContent = json.error || '認証コードが正しくありません。もう一度入力してください。';
                errEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = '認証する';
            }
        })
        .catch(function(err) {
            errEl.textContent = 'エラー: ' + err.message;
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '認証する';
        });
};

// v3 専用: OTP認証成功後の処理
// finalSubmit を呼んで (interview 空) スプシ書き込み + Slack通知 → 完了画面表示
window.v3SubmitAndComplete = function() {
    // formData に基本情報を最新化
    formData.phone = document.getElementById('phone').value;
    formData.email = document.getElementById('email').value;
    formData.fullName = document.getElementById('fullName').value;
    var y = document.getElementById('birthYear').value;
    var m = document.getElementById('birthMonth').value;
    var d = document.getElementById('birthDay').value;
    formData.birthDate = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    formData.prefecture = document.getElementById('prefecture').value;
    // interview は空のまま (v3 は面談日時選択なし)
    formData.interviewDateTime1 = '';
    formData.interviewDateTime2 = '';
    formData.interviewDateTime3 = '';
    formData.interviewStart = '';
    formData.interviewEnd = '';

    // finalSubmit (rowIndex=0 → backend が writeNewRow + Slack)
    // fetch のレスポンスを待ってから遷移 → Slack通知が確実に完了する (v1/v2/v4と同じ設計)
    var navigated = false;
    function goToThanks() {
        if (navigated) return;
        navigated = true;
        // thanks.html (別ページ) へ遷移することで GTM のページビュートリガーが発火 → CV 計測される
        window.location.href = '/v3/thanks.html';
    }

    fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, formData, { action: 'finalSubmit', rowIndex: 0, version: 'v3' })),
        keepalive: true
    }).then(function() { goToThanks(); })
      .catch(function(err) { console.warn('v3 finalSubmit error:', err); goToThanks(); });

    // 8秒でフォールバック遷移 (API応答が異常に遅い場合の最終保険)
    setTimeout(goToThanks, 8000);
};

window.backToPhoneInput = function() {
    document.getElementById('otpInputArea').style.display = 'none';
    document.getElementById('phoneInputArea').style.display = 'block';
    document.getElementById('step6Title').textContent = '電話番号を入力してください';
    document.getElementById('step6Note').style.display = '';
    document.getElementById('otpCode').value = '';
    document.getElementById('otpError').style.display = 'none';
    document.getElementById('nextBtn6').disabled = false;
    document.getElementById('nextBtn6').textContent = '認証コードを送信';
};

window.resendOTP = function() {
    var link = document.getElementById('resendLink');
    link.textContent = '再送中...';
    link.style.pointerEvents = 'none';
    sendOTP();
    setTimeout(function() {
        link.textContent = 'コードを再送する';
        link.style.pointerEvents = 'auto';
    }, 10000);
};

window.validateStep7 = function() {
    var e = document.getElementById('email').value;
    var er = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var ev = er.test(e);
    var ee = document.getElementById('emailError');
    if (e.trim() !== '' && !ev) { ee.style.display = 'block'; } else { ee.style.display = 'none'; }
    document.getElementById('nextBtn7').disabled = !ev;
};

window.initializeBirthDateSelects = function() {
    var y = document.getElementById('birthYear');
    var m = document.getElementById('birthMonth');
    var d = document.getElementById('birthDay');
    for (var yr = 2005; yr >= 1993; yr--) {
        var o = document.createElement('option');
        o.value = yr;
        o.textContent = yr + '年';
        y.appendChild(o);
    }
    for (var mo = 1; mo <= 12; mo++) {
        var o2 = document.createElement('option');
        o2.value = mo;
        o2.textContent = mo + '月';
        m.appendChild(o2);
    }
    for (var da = 1; da <= 31; da++) {
        var o3 = document.createElement('option');
        o3.value = da;
        o3.textContent = da + '日';
        d.appendChild(o3);
    }
};

// v3: step8 関連の関数 (prefetchAllSlots / fetchStep8Slots / renderStep8 /
//      selectStep8Option / onOtherDateChange / onOtherTimeChange /
//      updateStep8NextButton / getStep8Selection) はすべて削除済み。
//      面談日時選択がないため不要。

window.nextStep = function() {
    // 第1送信: step6（電話番号）→ その時点までの全データを隠しiframeで送信
    if (currentStep === 6) {
        // v3: step6 で firstSubmit を呼ばない (OTP認証成功時に finalSubmit で一括書き込み)
    }
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep++;
    document.getElementById('step' + currentStep).classList.remove('hidden');
    updateProgress();
    document.getElementById('formContent').scrollTop = 0;
    var st = strengths.find(function(s) { return s.step === currentStep; });
    if (st) {
        var i = strengths.indexOf(st);
        setTimeout(function() { showStrength(i); }, 300);
    }
};

window.prevStep = function() {
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep--;
    document.getElementById('step' + currentStep).classList.remove('hidden');
    updateProgress();
    document.getElementById('formContent').scrollTop = 0;
};

// v3: submitForm / getStep8Selection / fetchStep8Slots は削除済み (面談日時選択なし)

// ========== UTM パラメータキャプチャ ==========
// 優先順位: URL > sessionStorage > referrer推測 > 'direct'

window.captureUtmParams = function() {
    var params = new URLSearchParams(window.location.search);
    var urlSource = params.get('utm_source');
    var urlContent = params.get('utm_content');

    // URLにあればsessionStorageを上書き（新しい流入を優先）
    if (urlSource) {
        try { sessionStorage.setItem('utm_source', urlSource); } catch(e) {}
    }
    if (urlContent) {
        try { sessionStorage.setItem('utm_content', urlContent); } catch(e) {}
    }

    // sessionStorageから読み込み
    var storedSource = '';
    var storedContent = '';
    try {
        storedSource = sessionStorage.getItem('utm_source') || '';
        storedContent = sessionStorage.getItem('utm_content') || '';
    } catch(e) {}

    // それでも空ならreferrerから推測
    if (!storedSource) {
        storedSource = inferSourceFromReferrer();
        // 推測結果もsessionStorageに保存（セッション中で一貫性を保つ）
        try { sessionStorage.setItem('utm_source', storedSource); } catch(e) {}
    }

    formData.utmSource = storedSource;
    formData.utmContent = storedContent;
};

window.inferSourceFromReferrer = function() {
    var ref = document.referrer || '';
    if (!ref) return 'direct';
    try {
        var host = new URL(ref).hostname.toLowerCase();
        if (host.indexOf('google.') !== -1) return 'google-organic';
        if (host.indexOf('yahoo.') !== -1) return 'yahoo-organic';
        if (host.indexOf('bing.') !== -1) return 'bing-organic';
        if (host.indexOf('duckduckgo.') !== -1) return 'duckduckgo-organic';
        if (host.indexOf('facebook.') !== -1 || host.indexOf('fb.') !== -1) return 'facebook-referral';
        if (host.indexOf('instagram.') !== -1) return 'instagram-referral';
        if (host.indexOf('twitter.') !== -1 || host.indexOf('x.com') !== -1 || host.indexOf('t.co') !== -1) return 'twitter-referral';
        if (host.indexOf('tiktok.') !== -1) return 'tiktok-referral';
        if (host.indexOf('line.') !== -1 || host.indexOf('liff.') !== -1) return 'line-referral';
        if (host.indexOf('youtube.') !== -1) return 'youtube-referral';
        return 'referral:' + host;
    } catch(e) {
        return 'direct';
    }
};

document.addEventListener('DOMContentLoaded', function() {
    captureUtmParams();   // URL/sessionStorage/referrerからUTM取得
    updateProgress();
    initializeBirthDateSelects();
    // v3: 面談日時選択なし → prefetchAllSlots() は不要 (削除済み)
});

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
    utmContent: '',
    version: 'v2'
};

var currentStep = 1;
var totalSteps = 7;

var strengths = [
    { step: 2, title: '平均年収100万円UP',    emoji: '💵' },
    { step: 4, title: '未経験特化',            emoji: '✨' },
    { step: 6, title: '全て無料',              emoji: '🆓' },
    { step: 8, title: '内定まで全てサポート',   emoji: '🤝' }
];

// Vercel API (旧GAS Web App から移行)
var API_BASE = 'https://reiwa-form-api.vercel.app';
var FORM_URL = API_BASE + '/api/form';
var SLOTS_URL = API_BASE + '/api/slots';
// 後方互換用 (一部の form.action 等で使用)
var GAS_URL = FORM_URL;

var allSlotsCache = null;
var quickSlotsCache = null;
var step8Selection = null;        // {type: 'now'|'quick'|'other', index: number|null}
var step8OtherDate = '';
var step8OtherTime = '';

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
                // 認証成功 → 次のステップへ
                nextStep();
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

// ========== プリフェッチ（フォーム読み込み時に裏で実行） ==========

var prefetchPromise = null;

window.prefetchAllSlots = function() {
    if (allSlotsCache) return;
    if (prefetchPromise) return;
    prefetchPromise = fetch(SLOTS_URL + '?action=all_slots&days=14&version=v2')
        .then(function(res) { return res.json(); })
        .then(function(json) {
            if (json.success && json.slots) {
                allSlotsCache = json.slots;
                if (currentStep === 8) renderStep8(allSlotsCache);
            }
            return json;
        })
        .catch(function() { prefetchPromise = null; });
};

// ========== Step8 (v2): 日付ボタン + 時間/分プルダウン + 今すぐ相談する ==========

// v2 用ステート
var v2Mode = null;            // 'instant' | 'datetime' | null
var v2SelectedDate = '';      // dateLabel 例: "5/18(月)"

function formatDateLabel(date) {
    var days = ['日', '月', '火', '水', '木', '金', '土'];
    return (date.getMonth() + 1) + '/' + date.getDate() + '(' + days[date.getDay()] + ')';
}

window.fetchStep8Slots = function() {
    // プリフェッチ済みなら即初期化
    if (allSlotsCache) { initStep8V2(allSlotsCache); return; }
    // プリフェッチ中ならその完了を待つ
    var promise = prefetchPromise || fetch(SLOTS_URL + '?action=all_slots&days=14&version=v2').then(function(res) { return res.json(); });
    promise
        .then(function(json) {
            if (allSlotsCache) { initStep8V2(allSlotsCache); return; }
            if (!json || !json.success || !json.slots) { initStep8V2([]); return; }
            allSlotsCache = json.slots;
            initStep8V2(json.slots);
        })
        .catch(function() { initStep8V2([]); });
};

window.initStep8V2 = function(slots) {
    // 利用可能な日付 (dateLabel) を時系列順で抽出
    var availableDates = [];
    var seen = {};
    slots.forEach(function(s) {
        if (!seen[s.dateLabel]) {
            seen[s.dateLabel] = true;
            availableDates.push(s.dateLabel);
        }
    });

    // 今日と明日のラベルを計算
    var today = new Date();
    var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    var todayLabel = formatDateLabel(today);
    var tomorrowLabel = formatDateLabel(tomorrow);

    // 日付ボタン (今日 / 明日 をそれぞれ利用可能なら表示)
    var btnContainer = document.getElementById('v2DateButtons');
    btnContainer.innerHTML = '';
    var quickDates = [];
    if (seen[todayLabel])    quickDates.push({ label: todayLabel, head: '今日' });
    if (seen[tomorrowLabel]) quickDates.push({ label: tomorrowLabel, head: '明日' });
    // 今日が営業時間外の場合は明後日も追加表示
    if (!seen[todayLabel]) {
        var dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);
        var dayAfterLabel = formatDateLabel(dayAfter);
        if (seen[dayAfterLabel]) quickDates.push({ label: dayAfterLabel, head: '明後日' });
    }
    quickDates.forEach(function(d) {
        var btn = document.createElement('button');
        btn.className = 'v2-date-btn';
        btn.setAttribute('data-date', d.label);
        btn.innerHTML = d.head + '<span class="v2-date-btn-sub">' + d.label + '</span>';
        btn.onclick = function() { selectV2Date(d.label); };
        btnContainer.appendChild(btn);
    });

    // 「その他の日付」プルダウン: クイックボタンに無い日付のみ
    var otherSelect = document.getElementById('v2OtherDate');
    var quickSet = {};
    quickDates.forEach(function(d) { quickSet[d.label] = true; });
    var html = '<option value="">選択</option>';
    availableDates.forEach(function(dLabel) {
        if (!quickSet[dLabel]) {
            html += '<option value="' + dLabel + '">' + dLabel + '</option>';
        }
    });
    otherSelect.innerHTML = html;

    // 時間/分プルダウンは未選択状態に
    resetV2TimeDropdowns();
};

function resetV2TimeDropdowns() {
    var hourSel = document.getElementById('v2Hour');
    var minSel = document.getElementById('v2Minute');
    hourSel.innerHTML = '<option value="">--</option>';
    hourSel.disabled = true;
    minSel.value = '';
    minSel.disabled = true;
}

window.selectInstant = function() {
    v2Mode = 'instant';
    v2SelectedDate = '';
    // 日付ボタン/その他選択を解除
    document.querySelectorAll('.v2-date-btn.selected').forEach(function(b) { b.classList.remove('selected'); });
    document.getElementById('v2OtherDate').value = '';
    resetV2TimeDropdowns();
    document.getElementById('btnInstant').classList.add('selected');
    document.getElementById('v2TimeNote').style.display = 'none';
    updateStep8NextButton();
};

window.selectV2Date = function(dateLabel) {
    v2Mode = 'datetime';
    v2SelectedDate = dateLabel;
    // 「今すぐ相談する」選択解除
    document.getElementById('btnInstant').classList.remove('selected');
    // 日付ボタンのアクティブ状態を更新
    document.querySelectorAll('.v2-date-btn').forEach(function(b) {
        b.classList.toggle('selected', b.getAttribute('data-date') === dateLabel);
    });
    // 「その他」プルダウンと値が一致しなければクリア
    var otherSel = document.getElementById('v2OtherDate');
    if (otherSel.value !== dateLabel) otherSel.value = '';
    populateHourDropdown(dateLabel);
};

window.onV2OtherDateChange = function() {
    var dateLabel = document.getElementById('v2OtherDate').value;
    if (!dateLabel) return;
    v2Mode = 'datetime';
    v2SelectedDate = dateLabel;
    document.getElementById('btnInstant').classList.remove('selected');
    document.querySelectorAll('.v2-date-btn.selected').forEach(function(b) { b.classList.remove('selected'); });
    populateHourDropdown(dateLabel);
};

function populateHourDropdown(dateLabel) {
    var hourSel = document.getElementById('v2Hour');
    var minSel = document.getElementById('v2Minute');
    var note = document.getElementById('v2TimeNote');
    var slots = (allSlotsCache || []).filter(function(s) { return s.dateLabel === dateLabel; });
    // 選択可能な「時」を抽出（重複排除して昇順）
    var hourSet = {};
    slots.forEach(function(s) {
        var h = parseInt(s.timeLabel.substring(0, 2), 10);
        hourSet[h] = true;
    });
    var hours = Object.keys(hourSet).map(function(h) { return parseInt(h, 10); }).sort(function(a, b) { return a - b; });
    if (hours.length === 0) {
        hourSel.innerHTML = '<option value="">--</option>';
        hourSel.disabled = true;
        minSel.disabled = true;
        note.textContent = 'この日は空き枠がありません。別の日を選択してください。';
        note.style.display = 'block';
        updateStep8NextButton();
        return;
    }
    var html = '<option value="">--</option>';
    hours.forEach(function(h) { html += '<option value="' + h + '">' + h + '時</option>'; });
    hourSel.innerHTML = html;
    hourSel.disabled = false;
    minSel.value = '';
    minSel.disabled = false;
    note.style.display = 'none';
    updateStep8NextButton();
}

window.onV2TimeChange = function() {
    var hour = document.getElementById('v2Hour').value;
    var min = document.getElementById('v2Minute').value;
    var note = document.getElementById('v2TimeNote');
    if (!hour || min === '' || !v2SelectedDate) {
        note.style.display = 'none';
        updateStep8NextButton();
        return;
    }
    // 時/分の組み合わせが allSlotsCache に存在するか確認
    var target = pad2int(hour) + ':' + pad2int(min);
    var slots = (allSlotsCache || []).filter(function(s) {
        return s.dateLabel === v2SelectedDate && s.timeLabel.substring(0, 5) === target;
    });
    if (slots.length === 0) {
        note.textContent = 'この時間は満杯です。別の時間を選択してください。';
        note.style.display = 'block';
    } else {
        note.style.display = 'none';
    }
    updateStep8NextButton();
};

function pad2int(n) {
    n = parseInt(n, 10);
    return n < 10 ? '0' + n : String(n);
}

window.updateStep8NextButton = function() {
    var btn = document.getElementById('nextBtn8');
    if (v2Mode === 'instant') { btn.disabled = false; return; }
    if (v2Mode === 'datetime') {
        var hour = document.getElementById('v2Hour').value;
        var min = document.getElementById('v2Minute').value;
        if (!v2SelectedDate || !hour || min === '') { btn.disabled = true; return; }
        // 該当枠が cache に存在するかも確認
        var target = pad2int(hour) + ':' + pad2int(min);
        var matched = (allSlotsCache || []).some(function(s) {
            return s.dateLabel === v2SelectedDate && s.timeLabel.substring(0, 5) === target;
        });
        btn.disabled = !matched;
        return;
    }
    btn.disabled = true;
};

window.getStep8Selection = function() {
    if (v2Mode === 'instant') {
        // 最直近の空き枠を返す (allSlotsCache 先頭)
        // Phase 3 で GAS の ?action=instantSlot を呼ぶよう変更予定
        if (allSlotsCache && allSlotsCache.length > 0) {
            var s = allSlotsCache[0];
            return { label: s.dateLabel + ' ' + s.timeLabel + '(今すぐ相談)', start: s.start, end: s.end };
        }
        return { label: '今すぐ相談する', start: '', end: '' };
    }
    if (v2Mode === 'datetime') {
        var hour = document.getElementById('v2Hour').value;
        var min = document.getElementById('v2Minute').value;
        var target = pad2int(hour) + ':' + pad2int(min);
        if (allSlotsCache) {
            for (var i = 0; i < allSlotsCache.length; i++) {
                var os = allSlotsCache[i];
                if (os.dateLabel === v2SelectedDate && os.timeLabel.substring(0, 5) === target) {
                    return { label: os.dateLabel + ' ' + os.timeLabel, start: os.start, end: os.end };
                }
            }
        }
        return { label: v2SelectedDate + ' ' + target, start: '', end: '' };
    }
    return { label: '', start: '', end: '' };
};

window.nextStep = function() {
    // 第1送信: step6（電話番号）→ その時点までの全データを隠しiframeで送信
    if (currentStep === 6) {
        formData.phone = document.getElementById('phone').value;
        formData.email = document.getElementById('email').value;
        formData.fullName = document.getElementById('fullName').value;
        var y = document.getElementById('birthYear').value;
        var m = document.getElementById('birthMonth').value;
        var d = document.getElementById('birthDay').value;
        formData.birthDate = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        formData.prefecture = document.getElementById('prefecture').value;

        // firstSubmit: 行番号を sessionStorage に保存 → finalSubmit で送り返して同一行update
        fetch(FORM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({}, formData, { action: 'firstSubmit' })),
            keepalive: true
        }).then(function(res) { return res.json(); })
          .then(function(json) {
              if (json && json.rowIndex && json.rowIndex > 1) {
                  try { sessionStorage.setItem('formRowIndex', String(json.rowIndex)); } catch(e) {}
              }
          })
          .catch(function(err) { console.warn('firstSubmit error:', err); });
    }
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep++;
    if (currentStep === 7) { currentStep = 8; } // step7（メール）はstep6に統合済み
    document.getElementById('step' + currentStep).classList.remove('hidden');
    updateProgress();
    document.getElementById('formContent').scrollTop = 0;
    if (currentStep === 8) { fetchStep8Slots(); }
    var st = strengths.find(function(s) { return s.step === currentStep; });
    if (st) {
        var i = strengths.indexOf(st);
        setTimeout(function() { showStrength(i); }, 300);
    }
};

window.prevStep = function() {
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep--;
    if (currentStep === 7) { currentStep = 6; } // step7（メール）はstep6に統合済み
    document.getElementById('step' + currentStep).classList.remove('hidden');
    updateProgress();
    document.getElementById('formContent').scrollTop = 0;
};

window.submitForm = function() {
    formData.fullName = document.getElementById('fullName').value;
    var y = document.getElementById('birthYear').value;
    var m = document.getElementById('birthMonth').value;
    var d = document.getElementById('birthDay').value;
    formData.birthDate = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    formData.phone = document.getElementById('phone').value;
    formData.email = document.getElementById('email').value;
    formData.prefecture = document.getElementById('prefecture').value;

    var sel = getStep8Selection();
    formData.interviewDateTime1 = sel.label;
    formData.interviewDateTime2 = '';
    formData.interviewDateTime3 = '';
    formData.interviewStart = sel.start;
    formData.interviewEnd = sel.end;

    document.getElementById('step' + currentStep).classList.add('hidden');

    // finalSubmit: sessionStorage の rowIndex を送って同一行update
    var savedRowIndex = 0;
    try { savedRowIndex = parseInt(sessionStorage.getItem('formRowIndex') || '0', 10); } catch(e) {}
    fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({}, formData, { action: 'finalSubmit', rowIndex: savedRowIndex })),
        keepalive: true
    }).catch(function(err) { console.warn('finalSubmit error:', err); });

    // サンクスページへリダイレクト（送信処理と並行して遷移）
    setTimeout(function() {
        window.location.href = '/thanks.html?v=v2';
    }, 300);
};

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
    prefetchAllSlots();  // ユーザーが入力中に裏でカレンダー取得
});

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
    interviewEnd: ''
};

var currentStep = 1;
var totalSteps = 8;

var strengths = [
    { step: 2, title: '平均年収100万円UP',    emoji: '💵' },
    { step: 4, title: '未経験特化',            emoji: '✨' },
    { step: 6, title: '全て無料',              emoji: '🆓' },
    { step: 8, title: '内定まで全てサポート',   emoji: '🤝' }
];

var GAS_URL = 'https://script.google.com/macros/s/AKfycbwvb-2dIF4ZT9QVk41nRaMgwIIbSEdwUnkErtyvbSDLgtHUTGvhoqxPlU0ZyHr1Xf0xRw/exec';

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
    if (currentStep === 1) {
        setTimeout(function() { nextStep(); }, 300);
    }
};

window.validateStep3 = function() {
    var y = document.getElementById('birthYear').value;
    var m = document.getElementById('birthMonth').value;
    var d = document.getElementById('birthDay').value;
    document.getElementById('nextBtn3').disabled = !(y !== '' && m !== '' && d !== '');
};

window.validateStep4 = function() {
    var p = document.getElementById('prefecture').value;
    document.getElementById('nextBtn4').disabled = p === '';
};

window.validateStep5 = function() {
    var n = document.getElementById('fullName').value;
    document.getElementById('nextBtn5').disabled = n.trim() === '';
};

window.validateStep6 = function() {
    var p = document.getElementById('phone').value;
    var pr = /^(0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10})$/;
    var pv = pr.test(p.replace(/-/g, ''));
    var pe = document.getElementById('phoneError');
    if (p.trim() !== '' && !pv) { pe.style.display = 'block'; } else { pe.style.display = 'none'; }
    document.getElementById('nextBtn6').disabled = !pv;
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
    for (var yr = 2008; yr >= 1993; yr--) {
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

window.prefetchAllSlots = function() {
    if (allSlotsCache) return;
    fetch(GAS_URL + '?action=all_slots&days=14')
        .then(function(res) { return res.json(); })
        .then(function(json) {
            if (json.success && json.slots) {
                allSlotsCache = json.slots;
                if (currentStep === 8) renderStep8(allSlotsCache);
            }
        })
        .catch(function() {});
};

// ========== Step8: 統合UI（クイック+その他プルダウン） ==========

window.fetchStep8Slots = function() {
    var container = document.getElementById('step8Options');
    if (allSlotsCache) {
        renderStep8(allSlotsCache);
        return;
    }
    container.innerHTML = '<div class="quick-slots-loading">読み込み中…</div>';
    fetch(GAS_URL + '?action=all_slots&days=14')
        .then(function(res) { return res.json(); })
        .then(function(json) {
            if (!json.success || !json.slots || json.slots.length === 0) {
                container.innerHTML = '<div class="quick-slots-empty">直近の空き枠がありません。<br>「その他」から日程を選択してください。</div>';
                return;
            }
            allSlotsCache = json.slots;
            renderStep8(json.slots);
        })
        .catch(function(err) {
            container.innerHTML = '<div class="quick-slots-empty">空き枠の取得に失敗しました。<br>「その他」から日程を選択してください。</div>';
        });
};

window.renderStep8 = function(slots) {
    var container = document.getElementById('step8Options');
    if (!slots || slots.length === 0) {
        container.innerHTML = '<div class="quick-slots-empty">直近の空き枠がありません。<br>「その他」から日程を選択してください。</div>';
        return;
    }
    // 1日1枠で最大3日抽出
    var seen = {};
    var quick = [];
    for (var i = 0; i < slots.length && quick.length < 3; i++) {
        if (!seen[slots[i].dateLabel]) {
            seen[slots[i].dateLabel] = true;
            quick.push(slots[i]);
        }
    }
    quickSlotsCache = quick;

    var html = '';
    // 今すぐ相談する
    html += '<label class="radio-option" onclick="selectStep8Option(\'now\', null)">' +
            '<span class="radio-circle"></span>' +
            '<span>今すぐ相談する</span>' +
            '</label>';
    // クイック枠
    quick.forEach(function(s, i) {
        html += '<label class="radio-option" onclick="selectStep8Option(\'quick\', ' + i + ')">' +
                '<span class="radio-circle"></span>' +
                '<span>' + s.dateLabel + ' ' + s.timeLabel + '</span>' +
                '</label>';
    });
    // その他
    html += '<label class="radio-option" onclick="selectStep8Option(\'other\', null)">' +
            '<span class="radio-circle"></span>' +
            '<span>その他</span>' +
            '</label>';
    container.innerHTML = html;

    // ご希望日プルダウンに空きがある日付を追加
    var dateSelect = document.getElementById('otherDate');
    var seenDates = {};
    var dateOptions = '<option value="">選択してください</option>';
    slots.forEach(function(s) {
        if (!seenDates[s.dateLabel]) {
            seenDates[s.dateLabel] = true;
            dateOptions += '<option value="' + s.dateLabel + '">' + s.dateLabel + '</option>';
        }
    });
    dateSelect.innerHTML = dateOptions;
};

window.selectStep8Option = function(type, index) {
    step8Selection = { type: type, index: index };
    var labels = document.querySelectorAll('#step8Options .radio-option');
    labels.forEach(function(l) { l.classList.remove('selected'); });
    var quickCount = quickSlotsCache ? quickSlotsCache.length : 0;
    var targetIndex = type === 'now' ? 0 : (type === 'quick' ? 1 + index : 1 + quickCount);
    if (labels[targetIndex]) labels[targetIndex].classList.add('selected');
    var container = document.getElementById('otherSlotContainer');
    container.style.display = (type === 'other') ? 'block' : 'none';
    updateStep8NextButton();
};

window.onOtherDateChange = function() {
    var date = document.getElementById('otherDate').value;
    step8OtherDate = date;
    var timeSelect = document.getElementById('otherTime');
    if (!date || !allSlotsCache) {
        timeSelect.innerHTML = '<option value="">選択してください</option>';
        timeSelect.disabled = true;
        step8OtherTime = '';
        updateStep8NextButton();
        return;
    }
    var times = allSlotsCache.filter(function(s) { return s.dateLabel === date; });
    var html = '<option value="">選択してください</option>';
    times.forEach(function(s) {
        html += '<option value="' + s.timeLabel + '">' + s.timeLabel + '</option>';
    });
    timeSelect.innerHTML = html;
    timeSelect.disabled = false;
    step8OtherTime = '';
    updateStep8NextButton();
};

window.onOtherTimeChange = function() {
    step8OtherTime = document.getElementById('otherTime').value;
    updateStep8NextButton();
};

window.updateStep8NextButton = function() {
    var btn = document.getElementById('nextBtn8');
    if (!step8Selection) {
        btn.disabled = true;
        return;
    }
    if (step8Selection.type === 'other') {
        btn.disabled = !(step8OtherDate && step8OtherTime);
    } else {
        btn.disabled = false;
    }
};

window.getStep8Selection = function() {
    if (!step8Selection) return { label: '', start: '', end: '' };
    if (step8Selection.type === 'now') {
        // 当日の最初に空いている枠を返す
        if (allSlotsCache && allSlotsCache.length > 0) {
            var now = new Date();
            var todayY = now.getFullYear();
            var todayM = now.getMonth();
            var todayD = now.getDate();
            for (var i = 0; i < allSlotsCache.length; i++) {
                var s = allSlotsCache[i];
                var d = new Date(s.start);
                if (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD) {
                    return {
                        label: s.dateLabel + ' ' + s.timeLabel + '(今すぐ相談)',
                        start: s.start,
                        end: s.end
                    };
                }
            }
        }
        return { label: '今すぐ相談する', start: '', end: '' };
    }
    if (step8Selection.type === 'quick' && quickSlotsCache) {
        var qs = quickSlotsCache[step8Selection.index];
        return qs ? { label: qs.dateLabel + ' ' + qs.timeLabel, start: qs.start, end: qs.end }
                  : { label: '', start: '', end: '' };
    }
    if (step8Selection.type === 'other') {
        // 選択された日付・時間から allSlotsCache の該当エントリを検索
        if (allSlotsCache) {
            for (var j = 0; j < allSlotsCache.length; j++) {
                var os = allSlotsCache[j];
                if (os.dateLabel === step8OtherDate && os.timeLabel === step8OtherTime) {
                    return {
                        label: os.dateLabel + ' ' + os.timeLabel,
                        start: os.start,
                        end: os.end
                    };
                }
            }
        }
        return { label: step8OtherDate + ' ' + step8OtherTime, start: '', end: '' };
    }
    return { label: '', start: '', end: '' };
};

window.nextStep = function() {
    // 第1送信: step6（電話番号）→ その時点までの全データを隠しiframeで送信
    if (currentStep === 6) {
        formData.phone = document.getElementById('phone').value;
        formData.fullName = document.getElementById('fullName').value;
        var y = document.getElementById('birthYear').value;
        var m = document.getElementById('birthMonth').value;
        var d = document.getElementById('birthDay').value;
        formData.birthDate = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        formData.prefecture = document.getElementById('prefecture').value;

        var iframe1 = document.createElement('iframe');
        iframe1.name = 'hidden_iframe_first';
        iframe1.style.display = 'none';
        document.body.appendChild(iframe1);
        var form1 = document.createElement('form');
        form1.method = 'POST';
        form1.action = GAS_URL;
        form1.target = 'hidden_iframe_first';
        form1.style.display = 'none';
        var input1 = document.createElement('textarea');
        input1.name = 'data';
        input1.value = JSON.stringify(Object.assign({}, formData, { action: 'firstSubmit' }));
        form1.appendChild(input1);
        document.body.appendChild(form1);
        form1.submit();
    }
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep++;
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

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = GAS_URL;
    form.target = 'hidden_iframe';
    form.style.display = 'none';

    var input = document.createElement('textarea');
    input.name = 'data';
    input.value = JSON.stringify(Object.assign({}, formData, { action: 'finalSubmit' }));
    form.appendChild(input);

    var iframe = document.createElement('iframe');
    iframe.name = 'hidden_iframe';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    document.body.appendChild(form);
    form.submit();

    // サンクスページへリダイレクト（GASへの送信と並行して遷移）
    setTimeout(function() {
        window.location.href = 'thanks.html';
    }, 300);
};

document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    initializeBirthDateSelects();
    prefetchAllSlots();  // ユーザーが入力中に裏でカレンダー取得
});

var formData = {
    workStart: '',
    jobType: [],
    condition: [],
    education: '',
    employmentStatus: '',
    gender: '',
    interviewDateTime1: '',
    interviewDateTime2: '',
    interviewDateTime3: '',
    fullName: '',
    birthDate: '',
    phone: '',
    email: '',
    prefecture: ''
};

var currentStep = 1;
var totalSteps = 11;

var strengths = [
    { step: 2,  title: '平均年収100万円UP', emoji: '💵' },
    { step: 4,  title: '未経験特化',         emoji: '✨' },
    { step: 6,  title: '全て無料',            emoji: '🆓' },
    { step: 8,  title: '隠れホワイト求人多数', emoji: '🏢' },
    { step: 11, title: '内定まで全てサポート', emoji: '🤝' }
];

var currentWeek = 'next';
var selectedSlots = [];

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
    } else if (currentStep === 4 || currentStep === 5 || currentStep === 7) {
        if (n) n.disabled = false;
    } else if (currentStep === 6) {
        validateStep6();
    }
};

window.updateCheckboxes = function(f) {
    var g = f + 'Group';
    var cs = document.querySelectorAll('#' + g + ' input[type="checkbox"]');
    var ls = document.querySelectorAll('#' + g + ' .checkbox-label');
    formData[f] = [];
    ls.forEach(function(l, i) {
        if (cs[i].checked) {
            l.classList.add('checked');
            formData[f].push(cs[i].value);
        } else {
            l.classList.remove('checked');
        }
    });
    var n = document.getElementById('nextBtn' + currentStep);
    if (n) {
        n.disabled = formData[f].length === 0;
    }
};

window.validateStep6 = function() {
    var p = document.getElementById('prefecture').value;
    document.getElementById('nextBtn6').disabled = p === '';
};

window.validateStep8 = function() {
    var n = document.getElementById('fullName').value;
    var y = document.getElementById('birthYear').value;
    var m = document.getElementById('birthMonth').value;
    var d = document.getElementById('birthDay').value;
    document.getElementById('nextBtn8').disabled = !(n.trim() !== '' && y !== '' && m !== '' && d !== '');
};

window.validateStep9 = function() {
    var p = document.getElementById('phone').value;
    var pr = /^(0\d{1,4}-?\d{1,4}-?\d{4}|0\d{9,10})$/;
    var pv = pr.test(p.replace(/-/g, ''));
    var pe = document.getElementById('phoneError');
    if (p.trim() !== '' && !pv) { pe.style.display = 'block'; } else { pe.style.display = 'none'; }
    document.getElementById('nextBtn9').disabled = !pv;
};

window.validateStep10 = function() {
    var e = document.getElementById('email').value;
    var er = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var ev = er.test(e);
    var ee = document.getElementById('emailError');
    if (e.trim() !== '' && !ev) { ee.style.display = 'block'; } else { ee.style.display = 'none'; }
    document.getElementById('nextBtn10').disabled = !ev;
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

window.selectWeek = function(w, e) {
    currentWeek = w;
    document.querySelectorAll('.week-btn').forEach(function(b) { b.classList.remove('active'); });
    e.classList.add('active');
    generateCalendar();
};

window.generateCalendar = function() {
    var c = document.getElementById('calendarContainer');
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var currentHour = now.getHours();
    var ds = [];
    for (var i = 0; i < 7; i++) {
        var d = new Date(today);
        d.setDate(today.getDate() + i);
        ds.push(d);
    }
    var ws = [];
    for (var h = 10; h <= 20; h++) { ws.push(String(h).padStart(2, '0') + ':00'); }
    var ss = [];
    for (var h2 = 13; h2 <= 18; h2++) { ss.push(String(h2).padStart(2, '0') + ':00'); }

    var t = '<table class="calendar-table"><thead><tr><th>日時</th>';
    ds.forEach(function(d) {
        var dn = ['日', '月', '火', '水', '木', '金', '土'];
        var n = dn[d.getDay()];
        var mo = d.getMonth() + 1;
        var dy = d.getDate();
        var isToday = (d.getTime() === today.getTime());
        var todayMark = isToday ? '<span style="color:#f59e0b;font-size:10px;display:block;">今日</span>' : '';
        t += '<th><div class="date-header">' + mo + '/' + dy + todayMark + '<span class="day-name">(' + n + ')</span></div></th>';
    });
    t += '</tr></thead><tbody>';

    var ms = Math.max(ws.length, ss.length);
    for (var i2 = 0; i2 < ms; i2++) {
        t += '<tr>';
        var tm = ws[i2] || ss[i2] || '';
        t += '<td>' + (tm || '') + '</td>';
        ds.forEach(function(d) {
            var dw = d.getDay();
            var isSat = dw === 6;
            var isSun = dw === 0;
            var isToday = (d.getTime() === today.getTime());
            var slotHour = parseInt((ws[i2] || ss[i2] || '0').split(':')[0]);
            var st;
            var ia = false;
            if (!isSat && !isSun && i2 < ws.length) {
                st = ws[i2];
                ia = true;
            } else if (isSat && i2 < ss.length) {
                st = ss[i2];
                ia = true;
            }
            if (isToday && slotHour <= currentHour) { ia = false; }
            if (ia && st) {
                var ymd = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                var si = ymd + '_' + st;
                var dn2 = ['日', '月', '火', '水', '木', '金', '土'];
                var dd = (d.getMonth() + 1) + '/' + d.getDate() + '(' + dn2[d.getDay()] + ') ' + st + '-' + String(parseInt(st.split(':')[0]) + 1).padStart(2, '0') + ':00';
                t += '<td class="time-cell available" onclick="selectSlot(\'' + si + '\',\'' + dd + '\')">○</td>';
            } else {
                t += '<td class="time-cell unavailable">×</td>';
            }
        });
        t += '</tr>';
    }
    t += '</tbody></table>';
    c.innerHTML = t;
    updateCellHighlights();
};

window.updateCellHighlights = function() {
    document.querySelectorAll('.time-cell').forEach(function(c) {
        c.classList.remove('selected', 'preference-1', 'preference-2', 'preference-3');
    });
    selectedSlots.forEach(function(s, i) {
        document.querySelectorAll('.time-cell').forEach(function(c) {
            if (c.getAttribute('onclick') && c.getAttribute('onclick').includes(s.id)) {
                c.classList.add('selected', 'preference-' + (i + 1));
            }
        });
    });
};

window.selectSlot = function(si, dt) {
    var ei = selectedSlots.findIndex(function(s) { return s.id === si; });
    if (ei !== -1) {
        selectedSlots.splice(ei, 1);
    } else {
        if (selectedSlots.length < 3) {
            selectedSlots.push({ id: si, text: dt });
        } else {
            alert('第3希望まで選択済みです。変更する場合は、既存の希望を削除してください。');
            return;
        }
    }
    updatePreferenceDisplay();
    updateCellHighlights();
    document.getElementById('nextBtn11').disabled = selectedSlots.length === 0;
};

window.updatePreferenceDisplay = function() {
    var info = document.getElementById('selectedSlotsInfo');
    if (selectedSlots.length === 0) {
        info.style.display = 'none';
        return;
    }
    info.style.display = 'block';
    for (var j = 1; j <= 3; j++) {
        var pd = document.getElementById('preference' + j);
        var pt = document.getElementById('preference' + j + 'Text');
        if (selectedSlots[j - 1]) {
            pd.style.display = 'flex';
            pt.textContent = selectedSlots[j - 1].text;
            formData['interviewDateTime' + j] = selectedSlots[j - 1].text;
        } else {
            pd.style.display = 'none';
            formData['interviewDateTime' + j] = '';
        }
    }
};

window.removePreference = function(pn) {
    if (pn <= selectedSlots.length) {
        selectedSlots.splice(pn - 1, 1);
        updatePreferenceDisplay();
        updateCellHighlights();
        document.getElementById('nextBtn11').disabled = selectedSlots.length === 0;
    }
};

window.nextStep = function() {
    // 第1送信: step9（電話番号）→ fire-and-forget
    if (currentStep === 9) {
        var phoneVal = document.getElementById('phone').value;
        fetch('https://script.google.com/macros/s/AKfycbwvb-2dIF4ZT9QVk41nRaMgwIIbSEdwUnkErtyvbSDLgtHUTGvhoqxPlU0ZyHr1Xf0xRw/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'firstSubmit', phone: phoneVal })
        }).catch(function(err) { console.log('firstSubmit failed:', err); });
    }
    document.getElementById('step' + currentStep).classList.add('hidden');
    currentStep++;
    document.getElementById('step' + currentStep).classList.remove('hidden');
    updateProgress();
    document.getElementById('formContent').scrollTop = 0;
    if (currentStep === 11) { generateCalendar(); }
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

    document.getElementById('step11').classList.add('hidden');
    document.getElementById('completion').classList.remove('hidden');
    currentStep = 12;
    updateProgress();

    var t = document.getElementById('strengthBoxTitle');
    if (t) { t.textContent = '🙏 ご回答ありがとうございます'; }

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://script.google.com/macros/s/AKfycbwvb-2dIF4ZT9QVk41nRaMgwIIbSEdwUnkErtyvbSDLgtHUTGvhoqxPlU0ZyHr1Xf0xRw/exec';
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
};

document.addEventListener('DOMContentLoaded', function() {
    updateProgress();
    initializeBirthDateSelects();
});
